-- ============================================================
-- Migration 00020: Conta do aluno (19/08/2026)
-- Execute APÓS 00019_revisao_curso.sql
--
-- Decisões da seção 7 do regras-negocio.md:
--   7.1 — confirmação de e-mail obrigatória: já é o comportamento do Supabase
--         Auth (Confirm email ligado no projeto). Nada a fazer aqui.
--   7.2 — sem idade mínima: nenhuma coluna, nenhuma checagem.
--   7.3 — recuperação de senha por e-mail: `resetPasswordForEmail` +
--         `updateUser` são do Auth, não do schema. O que faltava era tela.
--   7.4 — tela de perfil: nome e avatar já existem em `profiles` e a policy
--         `profiles_self_update` (00002) já deixa o dono editar; o guard da
--         00007 continua barrando `role`. E-mail é do `auth.users`, trocado
--         pelo próprio Auth com confirmação no endereço novo.
--   7.5 — marketing com descadastro: é a única coluna nova da seção.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Opt-out de marketing (7.5)
-- ------------------------------------------------------------
-- Default `true` porque a decisão é "pode mandar, com opção de descadastro" —
-- e não "só depois de aceitar". O carimbo existe pra provar quando a pessoa
-- desmarcou: sem data, um descadastro contestado é palavra contra palavra.
alter table public.profiles
  add column if not exists marketing_opt_in boolean not null default true,
  add column if not exists marketing_opt_in_changed_at timestamptz;

-- Quem for disparar campanha lê daqui. Índice parcial: a lista de envio é
-- sempre "quem aceita", nunca a tabela inteira.
create index if not exists idx_profiles_marketing_opt_in
  on public.profiles (id) where marketing_opt_in;

-- ------------------------------------------------------------
-- 2. O banco carimba a mudança, não o cliente (7.5)
-- ------------------------------------------------------------
-- Mesmo motivo dos carimbos de revisão da 00019: se a data viesse no update
-- do client, ela não valeria como prova de nada.
create or replace function public.guard_profile_role_change()
returns trigger as $$
begin
  if new.role is distinct from old.role and (select public.get_my_role()) <> 'admin' then
    raise exception 'Alteração de role não permitida.';
  end if;

  if new.marketing_opt_in is distinct from old.marketing_opt_in then
    new.marketing_opt_in_changed_at := now();
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- O trigger `profiles_guard_role_change` (00007) já aponta pra esta função e
-- já é BEFORE UPDATE — o `create or replace` acima basta.
