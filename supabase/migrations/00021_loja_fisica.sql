-- ============================================================
-- Migration 00021: Loja de produtos físicos (19/08/2026)
-- Execute APÓS 00020_conta_do_aluno.sql
--
-- Decisões da seção 8 do regras-negocio.md:
--   8.1 — endereço vem do checkout do Stripe. O pedido passa a ter onde
--         guardar: até aqui a loja cobrava e ninguém sabia pra onde enviar.
--   8.2 — frete calculado por CEP. O valor é cotado antes do checkout e
--         congelado no pedido — recotizar depois mudaria o total já pago.
--   8.3 — despacho por fornecedor terceirizado, com código de rastreio
--         obrigatório pra marcar como enviado.
--   8.4 — produto vendido pela página da aula gera comissão pro professor;
--         vendido pela aba Loja, a receita é toda da plataforma.
--   8.5 — o professor vincula produtos já cadastrados às aulas dele e pode
--         pedir o cadastro de um produto externo.
--   8.6 — 7 dias de troca/devolução, contados do recebimento.
--   8.7 — entrega em todo o Brasil: a tabela de frete cobre as nove faixas
--         de CEP e o checkout só aceita endereço no Brasil.
--
-- Mudança estrutural: o pedido passa a nascer ANTES do checkout, em
-- 'pending'. Antes ele era montado no webhook a partir de um resumo
-- `"<uuid>:<qtd>,"` na metadata do Stripe, que estourava o teto de 500
-- caracteres com ~12 produtos — e não tinha onde caber frete, endereço nem
-- a aula de origem de cada item. Agora a metadata leva só o id do pedido.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Entrega, frete e rastreio no pedido (8.1, 8.2, 8.3)
-- ------------------------------------------------------------
alter table public.orders
  -- Endereço como o Stripe devolve (8.1). Colunas soltas, e não um jsonb:
  -- é isso que o admin lê na tela de pedidos pra despachar.
  add column if not exists shipping_name text,
  add column if not exists shipping_line1 text,
  add column if not exists shipping_line2 text,
  add column if not exists shipping_city text,
  add column if not exists shipping_state text,
  add column if not exists shipping_postal_code text,
  add column if not exists shipping_country text not null default 'BR',
  -- CEP que o aluno digitou pra cotar o frete (8.2). Guardado separado do
  -- endereço do Stripe de propósito: se os dois divergirem, o frete cobrado
  -- não corresponde ao destino e o admin precisa ver isso antes de despachar.
  add column if not exists quoted_postal_code text,
  add column if not exists shipping_cost numeric(10,2) not null default 0,
  add column if not exists shipping_days integer,
  -- Rastreio (8.3). Obrigatório pra marcar como enviado — ver trigger abaixo.
  add column if not exists tracking_code text,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  -- Devolução (8.6), no mesmo formato do reembolso de matrícula (00016).
  add column if not exists return_status text not null default 'none',
  add column if not exists return_requested_at timestamptz,
  add column if not exists return_reason text,
  add column if not exists return_reviewed_at timestamptz,
  add column if not exists return_review_note text,
  -- Sem FK pra profiles: `orders` já tem student_id apontando pra lá e um
  -- segundo caminho deixaria `student:profiles(name)` ambíguo no PostgREST.
  add column if not exists return_reviewed_by uuid,
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_amount numeric(10,2);

alter table public.orders drop constraint if exists orders_return_status_check;
alter table public.orders add constraint orders_return_status_check
  check (return_status in ('none', 'requested', 'approved', 'rejected', 'refunded'));

-- Fila do admin: só os pedidos com devolução aberta entram no índice.
create index if not exists idx_orders_devolucao_pendente
  on public.orders (return_requested_at desc)
  where return_status = 'requested';

-- ------------------------------------------------------------
-- 2. Origem do item e comissão do professor (8.4)
-- ------------------------------------------------------------
-- A comissão é gravada por item, não lida de uma constante na hora de pagar:
-- mudar o percentual amanhã não pode reescrever o que já foi vendido hoje.
alter table public.order_items
  add column if not exists lesson_id uuid references public.lessons(id) on delete set null,
  -- Sem FK pra profiles pelo mesmo motivo do return_reviewed_by acima.
  add column if not exists teacher_id uuid,
  add column if not exists teacher_commission_rate numeric(5,2) not null default 0;

create index if not exists idx_order_items_teacher
  on public.order_items (teacher_id) where teacher_id is not null;

-- Repasse de produto entra em teacher_payouts junto com o de curso — a tela
-- de faturamento soma a coluna e não precisa saber a diferença.
alter table public.teacher_payouts
  add column if not exists order_id uuid references public.orders(id) on delete set null;

alter table public.teacher_payouts drop constraint if exists teacher_payouts_type_check;
alter table public.teacher_payouts add constraint teacher_payouts_type_check
  check (type in ('sale', 'refund_clawback', 'product_sale', 'product_clawback'));

-- Um repasse por pedido: retry do webhook não paga o professor duas vezes.
create unique index if not exists teacher_payouts_order_teacher_key
  on public.teacher_payouts (order_id, teacher_id)
  where order_id is not null and type = 'product_sale';

-- Percentual do professor sobre produto vendido na aula dele (8.4).
-- ⚠️ O valor definitivo não foi decidido no questionário ("uma porcentagem a
-- ser definida"). 10% é provisório e está numa função só pra ter um lugar
-- único pra mudar — em lib/utils.ts existe a constante espelho.
create or replace function public.comissao_produto_professor()
returns numeric as $$
  select 10.00::numeric;
$$ language sql immutable;

-- ------------------------------------------------------------
-- 3. Pedido nasce antes do pagamento (8.1, 8.2, 8.4)
-- ------------------------------------------------------------
-- Chamada pela rota de checkout com service role. Preço, estoque e a aula de
-- origem são resolvidos aqui, com a linha do produto travada — o cliente
-- manda id e quantidade, nada mais.
create or replace function public.create_pending_order(
  p_student_id uuid,
  p_items jsonb,          -- [{ "product_id": uuid, "quantity": int, "lesson_id": uuid|null }, ...]
  p_postal_code text,
  p_shipping_cost numeric,
  p_shipping_days integer
)
returns table (order_id uuid, subtotal numeric) as $$
declare
  v_order_id uuid;
  v_total numeric(10,2) := 0;
  v_item jsonb;
  v_product_id uuid;
  v_lesson_id uuid;
  v_quantity integer;
  v_price numeric(10,2);
  v_stock integer;
  v_name text;
  v_teacher_id uuid;
begin
  insert into public.orders (student_id, status, total, quoted_postal_code, shipping_cost, shipping_days)
  values (p_student_id, 'pending', 0, p_postal_code, coalesce(p_shipping_cost, 0), p_shipping_days)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_lesson_id  := nullif(v_item->>'lesson_id', '')::uuid;
    v_quantity   := (v_item->>'quantity')::integer;

    if v_quantity is null or v_quantity < 1 then
      raise exception 'Quantidade inválida.';
    end if;

    select price, stock, name into v_price, v_stock, v_name
    from public.products
    where id = v_product_id and is_active
    for update;

    if v_price is null then
      raise exception 'Produto indisponível.';
    end if;
    if v_quantity > v_stock then
      raise exception 'Estoque insuficiente para %', v_name;
    end if;

    -- Comissão só quando o item veio da página de uma aula (8.4). Comprado
    -- pela aba Loja, lesson_id chega nulo e o professor não entra na conta.
    v_teacher_id := null;
    if v_lesson_id is not null then
      select c.teacher_id into v_teacher_id
      from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = v_lesson_id
        and exists (
          select 1 from public.lesson_products lp
          where lp.lesson_id = v_lesson_id and lp.product_id = v_product_id
        );
    end if;

    insert into public.order_items (order_id, product_id, quantity, unit_price, lesson_id, teacher_id, teacher_commission_rate)
    values (
      v_order_id, v_product_id, v_quantity, v_price,
      case when v_teacher_id is null then null else v_lesson_id end,
      v_teacher_id,
      case when v_teacher_id is null then 0 else public.comissao_produto_professor() end
    );

    v_total := v_total + (v_price * v_quantity);
  end loop;

  if v_total = 0 then
    raise exception 'Pedido sem itens.';
  end if;

  update public.orders
     set total = v_total + coalesce(p_shipping_cost, 0)
   where id = v_order_id;

  return query select v_order_id, v_total;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.create_pending_order(uuid, jsonb, text, numeric, integer) from anon, authenticated;
grant execute on function public.create_pending_order(uuid, jsonb, text, numeric, integer) to service_role;

-- ------------------------------------------------------------
-- 4. Pagamento confirmado (8.1, 8.4)
-- ------------------------------------------------------------
-- Baixa de estoque, endereço e repasse numa transação só. Idempotente: o
-- Stripe reenvia o mesmo evento e o segundo passa reto.
create or replace function public.confirm_product_order(
  p_order_id uuid,
  p_payment_intent_id text,
  p_shipping jsonb default '{}'::jsonb
)
returns void as $$
declare
  v_item record;
begin
  update public.orders
     set status = 'paid',
         stripe_payment_intent_id = p_payment_intent_id,
         shipping_name        = coalesce(nullif(p_shipping->>'name', ''), shipping_name),
         shipping_line1       = coalesce(nullif(p_shipping->>'line1', ''), shipping_line1),
         shipping_line2       = coalesce(nullif(p_shipping->>'line2', ''), shipping_line2),
         shipping_city        = coalesce(nullif(p_shipping->>'city', ''), shipping_city),
         shipping_state       = coalesce(nullif(p_shipping->>'state', ''), shipping_state),
         shipping_postal_code = coalesce(nullif(p_shipping->>'postal_code', ''), shipping_postal_code),
         shipping_country     = coalesce(nullif(p_shipping->>'country', ''), shipping_country)
   where id = p_order_id
     and status = 'pending';

  if not found then
    return; -- evento repetido: o pedido já saiu de 'pending'.
  end if;

  -- `for update` na leitura: dois pedidos do mesmo produto quase simultâneos
  -- não podem ler o mesmo estoque antes de escrever.
  for v_item in
    select oi.product_id, oi.quantity, oi.unit_price, oi.teacher_id, oi.teacher_commission_rate
      from public.order_items oi
     where oi.order_id = p_order_id
  loop
    perform 1 from public.products where id = v_item.product_id for update;
    update public.products
       set stock = greatest(0, stock - v_item.quantity)
     where id = v_item.product_id;
  end loop;

  -- Um repasse por professor por pedido (8.4). O unique index acima é a
  -- rede de segurança contra evento repetido que passe pelo guard de cima.
  insert into public.teacher_payouts (teacher_id, amount, status, type, order_id)
  select oi.teacher_id,
         sum(oi.unit_price * oi.quantity * oi.teacher_commission_rate / 100),
         'pending',
         'product_sale',
         p_order_id
    from public.order_items oi
   where oi.order_id = p_order_id
     and oi.teacher_id is not null
   group by oi.teacher_id
  on conflict do nothing;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.confirm_product_order(uuid, text, jsonb) from anon, authenticated;
grant execute on function public.confirm_product_order(uuid, text, jsonb) to service_role;

-- `create_product_order` (00009) fica sem uso: montava o pedido no webhook a
-- partir da metadata, sem endereço, sem frete e sem origem do item. Sai daqui
-- pra ninguém chamar por engano.
drop function if exists public.create_product_order(uuid, text, jsonb);

-- ------------------------------------------------------------
-- 5. Rastreio obrigatório pra despachar (8.3)
-- ------------------------------------------------------------
-- Mesma lógica do motivo obrigatório na rejeição de curso (5.1): o despacho
-- é terceirizado, então o código é a única coisa que o aluno tem pra saber
-- onde a encomenda está. Sem ele, "Enviado" não informa nada.
create or replace function public.guard_order_status_change()
returns trigger as $$
begin
  if auth.uid() is null then return new; end if;

  if new.status is distinct from old.status then
    if new.status = 'shipped' then
      if coalesce(btrim(coalesce(new.tracking_code, old.tracking_code)), '') = '' then
        raise exception 'Informe o código de rastreio antes de marcar como enviado.';
      end if;
      new.tracking_code := btrim(coalesce(new.tracking_code, old.tracking_code));
      new.shipped_at := coalesce(old.shipped_at, now());
    end if;

    if new.status = 'delivered' then
      new.delivered_at := coalesce(old.delivered_at, now());
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists orders_guard_status_change on public.orders;
create trigger orders_guard_status_change
  before update on public.orders
  for each row execute function public.guard_order_status_change();

-- ------------------------------------------------------------
-- 6. Devolução em 7 dias (8.6)
-- ------------------------------------------------------------
-- O prazo do CDC conta da entrega, não da compra. Enquanto o pedido não foi
-- marcado como entregue o aluno pode pedir a qualquer momento — o produto
-- ainda não chegou, então a janela nem começou.
create or replace function public.request_product_return(p_order_id uuid, p_reason text)
returns void as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order
  from public.orders
  where id = p_order_id and student_id = auth.uid()
  for update;

  if not found then
    raise exception 'Pedido não encontrado.';
  end if;

  if v_order.status = 'pending' then
    raise exception 'Este pedido ainda não foi pago.';
  end if;

  if v_order.return_status <> 'none' then
    raise exception 'Já existe um pedido de devolução para esta compra.';
  end if;

  if v_order.delivered_at is not null and v_order.delivered_at < now() - interval '7 days' then
    raise exception 'O prazo de 7 dias para devolução já passou.';
  end if;

  update public.orders
     set return_status = 'requested',
         return_requested_at = now(),
         return_reason = nullif(btrim(p_reason), '')
   where id = p_order_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.request_product_return(uuid, text) to authenticated;

-- Decisão do admin. O estorno em si é da rota /api/devolucao, que fala com o
-- gateway; aqui fica só o que não pode depender do cliente.
create or replace function public.resolve_product_return(
  p_order_id uuid,
  p_aprovar boolean,
  p_amount numeric default null,
  p_note text default null
)
returns void as $$
begin
  update public.orders
     set return_status = case when p_aprovar then 'refunded' else 'rejected' end,
         return_reviewed_at = now(),
         return_review_note = nullif(btrim(p_note), ''),
         refunded_at = case when p_aprovar then now() else null end,
         refund_amount = case when p_aprovar then p_amount else null end
   where id = p_order_id
     and return_status = 'requested';

  if not found then
    return; -- já resolvida
  end if;

  -- Estorno do repasse do professor, espelhando a 00016: o que a plataforma
  -- devolve ao aluno não pode continuar contando como receita do professor.
  if p_aprovar then
    insert into public.teacher_payouts (teacher_id, amount, status, type, order_id)
    select oi.teacher_id,
           -sum(oi.unit_price * oi.quantity * oi.teacher_commission_rate / 100),
           'pending',
           'product_clawback',
           p_order_id
      from public.order_items oi
     where oi.order_id = p_order_id
       and oi.teacher_id is not null
     group by oi.teacher_id;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.resolve_product_return(uuid, boolean, numeric, text) from anon, authenticated;
grant execute on function public.resolve_product_return(uuid, boolean, numeric, text) to service_role;

-- ------------------------------------------------------------
-- 7. Produto pedido pelo professor (8.5)
-- ------------------------------------------------------------
-- Vincular produto já cadastrado à aula o professor sempre pôde (a policy
-- `lesson_products_teacher_manage` da 00002 já permitia) — faltava tela.
-- O que não existia era pedir o cadastro de um produto de fora.
create table if not exists public.product_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  -- Onde o professor viu o produto. É o que o admin usa pra cadastrar.
  reference_url text,
  suggested_price numeric(10,2),
  lesson_id uuid references public.lessons(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  -- Preenchido quando o admin cadastra o produto a partir do pedido.
  product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.product_requests enable row level security;

drop policy if exists "product_requests_teacher_read" on public.product_requests;
create policy "product_requests_teacher_read" on public.product_requests
  for select using (teacher_id = (select auth.uid()));

drop policy if exists "product_requests_teacher_insert" on public.product_requests;
create policy "product_requests_teacher_insert" on public.product_requests
  for insert with check (
    teacher_id = (select auth.uid())
    and (select public.get_my_raw_role()) in ('teacher', 'admin', 'owner')
  );

drop policy if exists "product_requests_admin_all" on public.product_requests;
create policy "product_requests_admin_all" on public.product_requests
  for all using ((select public.get_my_role()) = 'admin');

create index if not exists idx_product_requests_pendentes
  on public.product_requests (created_at) where status = 'pending';

-- Status e carimbos são do admin — o professor abre o pedido e espera.
create or replace function public.guard_product_request()
returns trigger as $$
begin
  if auth.uid() is null then return new; end if;

  if (select public.get_my_role()) = 'admin' then
    if new.status is distinct from old.status then
      new.reviewed_at := now();
      new.reviewed_by := auth.uid();
    end if;
    return new;
  end if;

  new.status := old.status;
  new.review_note := old.review_note;
  new.reviewed_at := old.reviewed_at;
  new.reviewed_by := old.reviewed_by;
  new.product_id := old.product_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists product_requests_guard on public.product_requests;
create trigger product_requests_guard
  before update on public.product_requests
  for each row execute function public.guard_product_request();
