-- ============================================================
-- Migration 00011: Sync de role no insert + estoque honesto (10/08/2026)
-- Execute APÓS 00010_aggregation_rpcs.sql
--
-- Dois achados da revisão de 10/08:
--
--   1. sync_role_with_teacher_status (00003) só roda `after update`. Uma linha
--      de teacher_profiles criada já com status='active' — seed, painel do
--      Supabase, importação — nunca promove profiles.role. O banco atual tem
--      exatamente esse estado: teacher_profiles.status='active' com
--      profiles.role='student', ou seja, um professor que loga e cai em /aluno.
--
--   2. create_product_order (00009) escrevia `greatest(0, v_stock - v_quantity)`.
--      O clamp em zero apaga a informação de que houve venda acima do estoque:
--      o pedido é criado, o dinheiro entra e ninguém fica sabendo que faltam
--      unidades. Ver nota sobre a janela de reserva no fim do arquivo.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Promoção de role também no insert
-- `old` é NULL em INSERT, então `new.status is distinct from old.status` seria
-- sempre verdadeiro ali — mas o trigger nem chegava a rodar. O tg_op deixa a
-- intenção explícita em vez de depender desse detalhe.
-- ------------------------------------------------------------
create or replace function public.sync_role_with_teacher_status()
returns trigger as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    if new.status = 'active' then
      update public.profiles set role = 'teacher' where id = new.user_id;
    elsif new.status = 'suspended' then
      update public.profiles set role = 'student' where id = new.user_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists teacher_profiles_sync_role on public.teacher_profiles;
create trigger teacher_profiles_sync_role
  after insert or update on public.teacher_profiles
  for each row execute function public.sync_role_with_teacher_status();

-- Backfill: quem já está 'active' mas ficou como student. O update dispara
-- profiles_sync_role_to_jwt (00005), então o claim no JWT acompanha — mas só
-- vale a partir do próximo refresh de token de quem já estiver logado.
update public.profiles p
set role = 'teacher'
from public.teacher_profiles tp
where tp.user_id = p.id
  and tp.status = 'active'
  and p.role <> 'teacher';

-- ------------------------------------------------------------
-- 2. Estoque reflete a realidade em vez de parar em zero
-- O pedido continua sendo criado mesmo sem saldo: o pagamento já aconteceu,
-- então falhar aqui deixaria o aluno pago e sem pedido, e o Stripe retentando
-- o webhook por dias. Estoque negativo é a leitura correta — significa "devo
-- N unidades" e aparece pro admin.
-- ------------------------------------------------------------
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
      continue; -- produto não existe mais — item ignorado
    end if;

    insert into public.order_items (order_id, product_id, quantity, unit_price)
    values (v_order_id, v_product_id, v_quantity, v_price);

    -- Sem greatest(): saldo negativo é backorder visível, não erro silencioso.
    update public.products
      set stock = v_stock - v_quantity
      where id = v_product_id;

    v_total := v_total + (v_price * v_quantity);
  end loop;

  update public.orders set total = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

-- NOTA (dívida conhecida): a checagem de estoque em /api/stripe/checkout-products
-- acontece na criação da sessão do Stripe, não na confirmação. Entre uma e outra
-- o aluno pode levar minutos no formulário de pagamento, e nesse intervalo outro
-- pedido pode zerar o saldo. Fechar isso de verdade exige reservar estoque na
-- criação da sessão e liberar no expire/cancel do Stripe — mudança maior, fora
-- do escopo desta migration. Até lá, o saldo negativo é o sinal de que ocorreu.
