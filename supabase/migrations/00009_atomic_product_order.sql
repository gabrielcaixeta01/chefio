-- ============================================================
-- Migration 00009: Pedido de produto atômico (06/08/2026)
-- Execute APÓS 00008_storage_buckets.sql
--
-- app/api/stripe/webhook/route.ts fazia isso em passos soltos: insert em
-- orders, insert em order_items, um update por item em products.stock
-- lendo e escrevendo em JS. Dois problemas:
--   1. Dois webhooks concorrentes pro mesmo produto liam o mesmo `stock`
--      antes de escrever — a segunda baixa perdia a primeira (lost update).
--   2. Se o insert de order_items falhasse no meio do loop, o pedido e a
--      baixa de estoque já feita ficavam sem rollback.
-- A função abaixo faz tudo numa transação só, com `for update` travando a
-- linha do produto antes de ler preço/estoque — o preço cobrado também
-- passa a vir do lock em vez de uma query solta antes do insert.
-- ============================================================

create or replace function public.create_product_order(
  p_student_id uuid,
  p_stripe_payment_intent_id text,
  p_items jsonb -- [{ "product_id": uuid, "quantity": int }, ...]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_total numeric(10,2) := 0;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_price numeric(10,2);
  v_stock integer;
begin
  -- Idempotência: evento repetido do Stripe pro mesmo payment_intent
  -- reaproveita o pedido já criado em vez de duplicar.
  if p_stripe_payment_intent_id is not null then
    select id into v_order_id
    from public.orders
    where stripe_payment_intent_id = p_stripe_payment_intent_id;

    if v_order_id is not null then
      return v_order_id;
    end if;
  end if;

  begin
    insert into public.orders (student_id, status, total, stripe_payment_intent_id)
    values (p_student_id, 'paid', 0, p_stripe_payment_intent_id)
    returning id into v_order_id;
  exception when unique_violation then
    -- Corrida entre o select acima e este insert (dois webhooks quase
    -- simultâneos pro mesmo evento) — o índice único da 00004 pegou.
    select id into v_order_id
    from public.orders
    where stripe_payment_intent_id = p_stripe_payment_intent_id;
    return v_order_id;
  end;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    select price, stock into v_price, v_stock
    from public.products
    where id = v_product_id
    for update;

    if v_price is null then
      continue; -- produto não existe mais — item ignorado, igual ao comportamento anterior
    end if;

    insert into public.order_items (order_id, product_id, quantity, unit_price)
    values (v_order_id, v_product_id, v_quantity, v_price);

    update public.products
      set stock = greatest(0, v_stock - v_quantity)
      where id = v_product_id;

    v_total := v_total + (v_price * v_quantity);
  end loop;

  update public.orders set total = v_total where id = v_order_id;

  return v_order_id;
end;
$$;
