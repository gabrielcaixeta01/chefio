-- ============================================================
-- Migration 00023: Evita recursao nas policies de perfil (19/08/2026)
-- Execute APOS 00022_lgpd.sql
--
-- `courses` tem policies permissivas para catalogo, professor e admin.
-- As duas ultimas chamam `get_my_role()`, que consulta `profiles`. A policy
-- `profiles_admin_all` tambem chamava essa funcao, formando um ciclo quando
-- o Postgres avaliava uma consulta publica a `courses`.
-- ============================================================

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'owner')
  );