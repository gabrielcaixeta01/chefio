-- ============================================================
-- Migration 00005: Role no JWT (05/08/2026)
-- Execute APÓS 00004_stripe_idempotency.sql
-- Evita o SELECT em profiles a cada request: o role passa a viver em
-- app_metadata do usuário, que o Supabase Auth já embute no access
-- token. Middleware e layouts leem `user.app_metadata.role` — grátis,
-- sem round-trip a mais — em vez de consultar a tabela.
-- ============================================================

create or replace function public.sync_role_to_jwt()
returns trigger as $$
begin
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role)
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists profiles_sync_role_to_jwt on public.profiles;
create trigger profiles_sync_role_to_jwt
  after insert or update of role on public.profiles
  for each row execute function public.sync_role_to_jwt();

-- Backfill: usuários já cadastrados também precisam do claim.
-- Sessões já ativas só pegam o novo claim no próximo refresh de token
-- (o access token atual, se já emitido, fica com o role antigo até expirar).
update auth.users u
set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role)
from public.profiles p
where p.id = u.id;
