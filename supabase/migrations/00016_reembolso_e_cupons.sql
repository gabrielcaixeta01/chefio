-- ============================================================
-- Migration 00016: Reembolso, chargeback e cupom (19/08/2026)
-- Execute APÓS 00015_owner_role_e_comissao.sql
--
-- Decisões de negócio implementadas aqui (seção 2 do regras-negocio.md):
--   2.1 — reembolso em até 7 dias corridos; automático quando o aluno
--         assistiu <= 30% do curso, acima disso vira pedido pra análise.
--   2.2 — a plataforma devolve do próprio caixa e desconta do próximo
--         repasse do professor (linha negativa em teacher_payouts).
--   2.3 — o acesso ao curso cai na hora em que o reembolso é processado.
--   2.4 — chargeback é prejuízo da plataforma: tira o acesso, mas NÃO
--         desconta do professor.
--   2.5 — uma matrícula por aluno já era garantido pelo unique de 00001.
--   2.6 — cupom de desconto criado só por admin/dono, com a plataforma
--         absorvendo o desconto (o professor recebe sobre o preço cheio).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Estado de reembolso na matrícula (2.1, 2.3)
-- ------------------------------------------------------------
-- A matrícula não é apagada: sem o histórico não dá pra identificar quem
-- compra-assiste-devolve em série, que é a "estratégia pra mitigar
-- reembolsos" anotada no doc. O que corta o acesso é refunded_at.
alter table public.enrollments
  add column if not exists refund_status text not null default 'none',
  add column if not exists refund_requested_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_amount numeric(10,2),
  add column if not exists refund_reason text,
  add column if not exists refund_review_note text,
  -- Sem FK pra profiles de propósito: enrollments já tem student_id
  -- apontando pra lá, e um segundo caminho deixaria os embeds do PostgREST
  -- (`student:profiles(name)`) ambíguos em todas as telas que já existem.
  add column if not exists refunded_by uuid;

alter table public.enrollments drop constraint if exists enrollments_refund_status_check;
alter table public.enrollments add constraint enrollments_refund_status_check
  check (refund_status in ('none', 'requested', 'refunded', 'rejected', 'chargeback'));

-- Valor abatido por cupom (2.6). Fica aqui e não só na tabela de cupons
-- porque o estorno precisa reconstruir o preço cheio da venda.
alter table public.enrollments
  add column if not exists discount_amount numeric(10,2) not null default 0;

-- Fila do admin: só as linhas pendentes entram no índice.
create index if not exists idx_enrollments_refund_pendente
  on public.enrollments (refund_requested_at desc)
  where refund_status = 'requested';

-- ------------------------------------------------------------
-- 2. Acesso cai na hora (2.3)
-- ------------------------------------------------------------
-- Estas duas policies são o gate real do conteúdo: o player pede a aula e o
-- anexo por elas. Sem o filtro aqui, esconder o curso na UI seria decoração.
alter policy "lessons_enrolled_student_read" on public.lessons
  using (
    exists (
      select 1 from public.enrollments
      where enrollments.course_id = lessons.course_id
        and enrollments.student_id = (select auth.uid())
        and enrollments.refunded_at is null
    )
  );

alter policy "lesson_attachments_enrolled_read" on public.lesson_attachments
  using (
    exists (
      select 1 from public.lessons l
      join public.enrollments e on e.course_id = l.course_id
      where l.id = lesson_attachments.lesson_id
        and e.student_id = (select auth.uid())
        and e.refunded_at is null
    )
  );

-- ------------------------------------------------------------
-- 3. Estorno do repasse do professor (2.2 / 2.4)
-- ------------------------------------------------------------
alter table public.teacher_payouts
  add column if not exists type text not null default 'sale',
  add column if not exists enrollment_id uuid references public.enrollments(id) on delete set null;

alter table public.teacher_payouts drop constraint if exists teacher_payouts_type_check;
alter table public.teacher_payouts add constraint teacher_payouts_type_check
  check (type in ('sale', 'refund_clawback'));

-- O estorno é uma linha de amount negativo. Somar a coluna já dá o líquido a
-- pagar — nenhuma tela de faturamento precisa saber que estorno existe.
create index if not exists idx_teacher_payouts_enrollment
  on public.teacher_payouts (enrollment_id)
  where enrollment_id is not null;

-- ------------------------------------------------------------
-- 4. Aluno pede o reembolso (2.1)
-- ------------------------------------------------------------
-- Vale como pedido só: quem devolve o dinheiro é a rota /api/reembolso, que
-- precisa falar com o gateway. Aqui ficam as regras que não podem depender
-- do cliente — dono da matrícula, janela de 7 dias, um pedido por matrícula.
create or replace function public.request_refund(p_enrollment_id uuid, p_reason text)
returns void as $$
declare
  v_enrollment public.enrollments%rowtype;
begin
  select * into v_enrollment
  from public.enrollments
  where id = p_enrollment_id and student_id = auth.uid()
  for update;

  if not found then
    raise exception 'Matrícula não encontrada.';
  end if;

  if v_enrollment.refund_status <> 'none' then
    raise exception 'Já existe um pedido de reembolso para esta matrícula.';
  end if;

  if v_enrollment.created_at < now() - interval '7 days' then
    raise exception 'O prazo de 7 dias para reembolso já passou.';
  end if;

  update public.enrollments
  set refund_status = 'requested',
      refund_requested_at = now(),
      refund_reason = nullif(trim(p_reason), '')
  where id = p_enrollment_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.request_refund(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 5. Efetivar o reembolso (2.2, 2.3, 2.4)
-- ------------------------------------------------------------
-- Chamada pela rota depois que o gateway confirmou a devolução. Marcar a
-- matrícula e lançar o estorno tem que ser uma transação só: se o estorno
-- falhasse depois do update, a plataforma comeria o prejuízo em silêncio.
--
-- p_clawback = false é o caso do chargeback (2.4), onde a decisão é a
-- plataforma arcar e não descontar do professor.
create or replace function public.process_refund(
  p_enrollment_id uuid,
  p_amount numeric,
  p_clawback boolean default true,
  p_status text default 'refunded'
)
returns void as $$
declare
  v_teacher_id uuid;
  v_commission numeric(5,2);
  v_desconto numeric(10,2);
begin
  update public.enrollments
  set refund_status = p_status,
      refunded_at = now(),
      refund_amount = p_amount
  where id = p_enrollment_id
    and refunded_at is null;

  if not found then
    return; -- já reembolsada: evento repetido do gateway, nada a fazer.
  end if;

  if not p_clawback or p_amount <= 0 then
    return;
  end if;

  -- O desconto do cupom volta pra base: o professor recebeu sobre o preço
  -- cheio (2.6), então é o preço cheio que tem que ser estornado dele.
  select c.teacher_id, e.discount_amount into v_teacher_id, v_desconto
  from public.enrollments e
  join public.courses c on c.id = e.course_id
  where e.id = p_enrollment_id;

  if v_teacher_id is null then
    return;
  end if;

  select commission_rate into v_commission
  from public.teacher_profiles
  where user_id = v_teacher_id;

  insert into public.teacher_payouts (teacher_id, amount, status, type, enrollment_id)
  values (
    v_teacher_id,
    -((p_amount + coalesce(v_desconto, 0)) * (1 - coalesce(v_commission, 15.00) / 100)),
    'pending',
    'refund_clawback',
    p_enrollment_id
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Só o service role (rota de reembolso e webhook) executa. O aluno tem
-- request_refund; o admin passa pela rota, que valida o papel.
revoke execute on function public.process_refund(uuid, numeric, boolean, text) from anon, authenticated;
grant execute on function public.process_refund(uuid, numeric, boolean, text) to service_role;

-- ------------------------------------------------------------
-- 6. Cupom de desconto (2.6)
-- ------------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and length(code) between 3 and 32),
  discount_percent int not null check (discount_percent between 1 and 100),
  -- null = vale para qualquer curso.
  course_id uuid references public.courses(id) on delete cascade,
  -- null = ilimitado.
  max_redemptions int check (max_redemptions is null or max_redemptions > 0),
  redemptions int not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_coupons_code on public.coupons (code) where active;

alter table public.enrollments
  add column if not exists coupon_id uuid references public.coupons(id) on delete set null;

alter table public.coupons enable row level security;

-- Ninguém lê a tabela pelo client: o cupom é conferido no servidor, senão
-- dava pra varrer a lista inteira de códigos ativos pelo PostgREST.
drop policy if exists "coupons_admin_all" on public.coupons;
create policy "coupons_admin_all" on public.coupons
  for all using ((select public.get_my_role()) = 'admin');

-- Baixa do cupom no momento em que a compra fecha (webhook), não no
-- checkout: carrinho abandonado não pode queimar um cupom limitado.
create or replace function public.redeem_coupon(p_coupon_id uuid)
returns void as $$
  update public.coupons
  set redemptions = redemptions + 1
  where id = p_coupon_id;
$$ language sql security definer set search_path = public;

revoke execute on function public.redeem_coupon(uuid) from anon, authenticated;
grant execute on function public.redeem_coupon(uuid) to service_role;

-- ------------------------------------------------------------
-- 7. Venda reembolsada sai dos totais
-- ------------------------------------------------------------
-- As agregações de 00010 somam `enrollments` inteiro. Com reembolso no ar,
-- uma venda devolvida continuaria contando como receita nos três painéis e
-- no faturamento do professor. `teacher_payouts` não precisa de filtro: o
-- estorno já entra como linha negativa e a soma se ajusta sozinha.
create or replace function public.get_admin_dashboard_stats()
returns table (
  total_courses bigint,
  pending_courses bigint,
  total_teachers bigint,
  total_students bigint,
  total_revenue numeric
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if (select public.get_my_role()) <> 'admin' then
    raise exception 'Forbidden';
  end if;

  return query
  select
    (select count(*) from public.courses where status = 'approved'),
    (select count(*) from public.courses where status = 'pending_review'),
    (select count(*) from public.profiles where role = 'teacher'),
    (select count(*) from public.profiles where role = 'student'),
    coalesce((select sum(amount_paid) from public.enrollments where refunded_at is null), 0);
end;
$$;

create or replace function public.get_admin_financial_totals()
returns table (total_gross numeric, total_payouts numeric, total_sales bigint)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if (select public.get_my_role()) <> 'admin' then
    raise exception 'Forbidden';
  end if;

  return query
  select
    coalesce((select sum(amount_paid) from public.enrollments where refunded_at is null), 0),
    coalesce((select sum(amount) from public.teacher_payouts), 0),
    (select count(*) from public.enrollments where refunded_at is null);
end;
$$;

create or replace function public.get_admin_monthly_revenue(months_back int default 6)
returns table (month text, total numeric)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if (select public.get_my_role()) <> 'admin' then
    raise exception 'Forbidden';
  end if;

  return query
  select to_char(date_trunc('month', e.created_at), 'YYYY-MM') as month,
         sum(e.amount_paid) as total
  from public.enrollments e
  where e.created_at >= date_trunc('month', now()) - ((months_back - 1) || ' months')::interval
    and e.refunded_at is null
  group by 1
  order by 1;
end;
$$;

-- O professor recebe sobre o preço cheio (2.6), então a base aqui soma o
-- desconto do cupom de volta — senão o painel dele mostraria menos do que
-- ele de fato vai receber.
create or replace function public.get_my_teacher_revenue_by_course()
returns table (course_id uuid, title text, sale_count bigint, gross numeric)
language sql
security invoker
set search_path = public
stable
as $$
  select c.id, c.title, count(e.id),
         coalesce(sum(e.amount_paid + e.discount_amount), 0)
  from public.courses c
  left join public.enrollments e
    on e.course_id = c.id and e.refunded_at is null
  where c.teacher_id = (select auth.uid())
  group by c.id, c.title
  order by coalesce(sum(e.amount_paid + e.discount_amount), 0) desc;
$$;
