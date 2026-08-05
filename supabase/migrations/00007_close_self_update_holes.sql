-- ============================================================
-- Migration 00007: Fecha brechas de auto-edição de colunas sensíveis (05/08/2026)
-- Execute APÓS 00006_rls_performance.sql
--
-- Achado na revisão das migrations anteriores: "profiles_self_update" e
-- "teacher_profiles_self_update" (00002) deixam o dono da linha editar
-- QUALQUER coluna — não só as inofensivas. Isso reabre, por outra porta,
-- exatamente a escalação de privilégio que a 00003 fechou no cadastro:
--
--   supabase.from('profiles').update({ role: 'admin' })
--   supabase.from('teacher_profiles').update({ status: 'active', commission_rate: 0 })
--
-- A segunda ficou pior depois da 00003: o trigger `teacher_profiles_sync_role`
-- promove profiles.role pra 'teacher' assim que status vira 'active' — ou
-- seja, hoje isso é auto-aprovação completa, sem admin no meio.
-- Nenhum código do app depende dessas colunas serem editáveis pelo dono
-- (grep confirma: profiles nunca é atualizado pelo client; teacher_profiles
-- só é atualizado pelo dono pra gravar stripe_account_id no onboarding).
-- ============================================================

-- PROFILES: dono pode editar o resto da própria linha, mas role só muda
-- via admin (profiles_admin_all) ou pela cascata de sync_role_with_teacher_status
-- — as duas rodam com auth.uid() do admin, então passam no check abaixo.
create or replace function public.guard_profile_role_change()
returns trigger as $$
begin
  if new.role is distinct from old.role and (select public.get_my_role()) <> 'admin' then
    raise exception 'Alteração de role não permitida.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists profiles_guard_role_change on public.profiles;
create trigger profiles_guard_role_change
  before update on public.profiles
  for each row execute function public.guard_profile_role_change();

-- TEACHER_PROFILES: dono pode editar bio/stripe_account_id (onboarding do
-- Stripe usa o client da própria sessão), mas status e commission_rate são
-- exclusivos do admin.
create or replace function public.guard_teacher_profile_admin_columns()
returns trigger as $$
begin
  if (select public.get_my_role()) = 'admin' then
    return new;
  end if;
  if new.status is distinct from old.status then
    raise exception 'Alteração de status não permitida.';
  end if;
  if new.commission_rate is distinct from old.commission_rate then
    raise exception 'Alteração de comissão não permitida.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists teacher_profiles_guard_admin_columns on public.teacher_profiles;
create trigger teacher_profiles_guard_admin_columns
  before update on public.teacher_profiles
  for each row execute function public.guard_teacher_profile_admin_columns();

-- ORDERS: mesma falha que a 00003 fechou em enrollments, nunca aplicada
-- aqui. Nenhum código do app insere em orders pelo client (só o webhook,
-- com service role) — a policy só servia pra deixar um aluno fabricar um
-- pedido com status 'paid' sem pagar nada.
drop policy if exists "orders_student_insert" on public.orders;
