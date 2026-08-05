-- ============================================================
-- Migration 00004: Idempotência de webhooks do Stripe (05/08/2026)
-- Execute APÓS 00003_security_fixes.sql
-- ============================================================

-- Um retry do Stripe não pode criar dois pedidos pro mesmo pagamento.
create unique index if not exists orders_stripe_payment_intent_id_key
  on public.orders (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- Nem duplicar o payout do professor.
create unique index if not exists teacher_payouts_stripe_transfer_id_key
  on public.teacher_payouts (stripe_transfer_id)
  where stripe_transfer_id is not null;
