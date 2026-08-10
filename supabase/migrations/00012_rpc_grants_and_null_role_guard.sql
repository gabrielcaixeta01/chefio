-- ============================================================
-- Migration 00012: Permissão de EXECUTE nas RPCs + guard que falhava
-- aberto para anônimo (10/08/2026)
-- Execute APÓS 00011_role_sync_on_insert_and_stock.sql
--
-- Achados na verificação de estado do banco, não na leitura do código —
-- os dois só aparecem quando se pergunta ao Postgres QUEM pode chamar
-- o quê. As migrations 00009 e 00010 criam funções `security definer`
-- e nunca mexem em permissão: o padrão do Postgres é conceder EXECUTE
-- a PUBLIC na criação, e no Supabase tanto `anon` quanto `authenticated`
-- herdam de PUBLIC. Toda RPC nasceu chamável por visitante anônimo.
-- ============================================================

-- ------------------------------------------------------------
-- 1. CRÍTICO: pedido pago fabricado sem pagamento
--
-- create_product_order é `security definer` (roda como o dono, ignorando
-- RLS), insere em orders com status='paid' e recebe `p_student_id` como
-- PARÂMETRO — não deriva de auth.uid(). Com EXECUTE liberado pra anon,
-- qualquer um com a chave anônima (que vive no bundle do browser, é
-- pública por design) cria pedido pago pra qualquer aluno e derruba o
-- estoque, sem passar pelo Stripe.
--
-- Quem chama isso é só o webhook (app/api/stripe/webhook/route.ts), com
-- service role. Nem `anon` nem `authenticated` têm motivo pra alcançar.
-- ------------------------------------------------------------
revoke execute on function public.create_product_order(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_product_order(uuid, text, jsonb)
  to service_role;

-- ------------------------------------------------------------
-- 2. CRÍTICO: guard de admin não barra quem não tem sessão
--
-- O guard das 3 funções da 00010 era:
--
--     if (select public.get_my_role()) <> 'admin' then
--       raise exception 'Forbidden';
--     end if;
--
-- Para um anônimo, auth.uid() é NULL, get_my_role() não encontra linha em
-- profiles e devolve NULL. `NULL <> 'admin'` não é `true` — é NULL — e o
-- PL/pgSQL trata NULL como falso, então o `if` não dispara e a função
-- segue e RETORNA OS DADOS. Resultado: qualquer visitante lia receita
-- total, faturamento mensal e contagem de alunos/professores da plataforma.
--
-- Funcionava pra aluno e professor logados (role não-nulo), o que fazia
-- o buraco passar despercebido em qualquer teste com sessão aberta.
--
-- `is distinct from` é a comparação que trata NULL como valor: NULL is
-- distinct from 'admin' → true → levanta a exceção, como se esperava.
-- ------------------------------------------------------------
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
  if (select public.get_my_role()) is distinct from 'admin' then
    raise exception 'Forbidden';
  end if;

  return query
  select
    (select count(*) from public.courses where status = 'approved'),
    (select count(*) from public.courses where status = 'pending_review'),
    (select count(*) from public.profiles where role = 'teacher'),
    (select count(*) from public.profiles where role = 'student'),
    coalesce((select sum(amount_paid) from public.enrollments), 0);
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
  if (select public.get_my_role()) is distinct from 'admin' then
    raise exception 'Forbidden';
  end if;

  return query
  select
    coalesce((select sum(amount_paid) from public.enrollments), 0),
    coalesce((select sum(amount) from public.teacher_payouts), 0),
    (select count(*) from public.enrollments);
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
  if (select public.get_my_role()) is distinct from 'admin' then
    raise exception 'Forbidden';
  end if;

  return query
  select to_char(date_trunc('month', e.created_at), 'YYYY-MM') as month,
         sum(e.amount_paid) as total
  from public.enrollments e
  where e.created_at >= date_trunc('month', now()) - ((months_back - 1) || ' months')::interval
  group by 1
  order by 1;
end;
$$;

-- ------------------------------------------------------------
-- 3. Mesma armadilha de NULL em guard_profile_role_change (00007)
--
-- `new.role is distinct from old.role and (select get_my_role()) <> 'admin'`
-- vira `true and NULL` = NULL quando o role é nulo, e a exceção não sobe.
-- Hoje não é explorável — pra chegar no trigger é preciso passar pela
-- policy profiles_self_update, que exige `id = auth.uid()`, ou seja
-- auth.uid() não é nulo e get_my_role() acha a linha. Corrigido mesmo
-- assim: a segurança da linha não deveria depender de um detalhe de
-- outra camada continuar verdadeiro.
-- ------------------------------------------------------------
create or replace function public.guard_profile_role_change()
returns trigger as $$
begin
  if new.role is distinct from old.role
     and (select public.get_my_role()) is distinct from 'admin' then
    raise exception 'Alteração de role não permitida.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ------------------------------------------------------------
-- 4. Permissões finais das RPCs de leitura
--
-- As 3 funções admin são chamadas por server component com a SESSÃO do
-- usuário (role `authenticated`), então precisam do grant — a barreira é
-- o guard corrigido acima, não a permissão. `anon` sai: sem sessão não
-- existe caso de uso legítimo, e é uma camada a menos de dependência do
-- guard estar certo.
--
-- get_my_teacher_revenue_by_course é `security invoker` (RLS se aplica
-- normalmente), então nunca foi um furo — anon só receberia vazio. Fica
-- alinhada com as outras por consistência.
-- ------------------------------------------------------------
revoke execute on function public.get_admin_dashboard_stats()          from public, anon;
revoke execute on function public.get_admin_financial_totals()         from public, anon;
revoke execute on function public.get_admin_monthly_revenue(int)       from public, anon;
revoke execute on function public.get_my_teacher_revenue_by_course()   from public, anon;

grant execute on function public.get_admin_dashboard_stats()        to authenticated, service_role;
grant execute on function public.get_admin_financial_totals()       to authenticated, service_role;
grant execute on function public.get_admin_monthly_revenue(int)     to authenticated, service_role;
grant execute on function public.get_my_teacher_revenue_by_course() to authenticated, service_role;

-- ------------------------------------------------------------
-- 5. get_my_role: usada dentro das policies, nunca pela aplicação
-- Não precisa estar exposta como RPC pra ninguém — as policies a chamam
-- no contexto do servidor, o que independe deste grant.
-- ------------------------------------------------------------
revoke execute on function public.get_my_role() from public, anon;
