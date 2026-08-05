-- ============================================================
-- Migration 00003: Correções críticas de segurança (05/08/2026)
-- Execute APÓS 00002_rls_policies.sql
-- Ver MELHORIAS.md para o detalhamento de cada furo.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Escalação de privilégio no cadastro
-- O role nunca é confiado do client. Todo mundo nasce 'student';
-- quem pede 'teacher' no cadastro vira solicitação pendente em
-- teacher_profiles, e só vira professor de fato quando o admin
-- aprova (ver trigger #2 abaixo).
-- ------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'student'
  );

  if new.raw_user_meta_data->>'role' = 'teacher' then
    insert into public.teacher_profiles (user_id, status)
    values (new.id, 'pending');
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Aprovação/suspensão em teacher_profiles (feita pelo admin em
-- /admin/professores) sincroniza profiles.role automaticamente.
create or replace function public.sync_role_with_teacher_status()
returns trigger as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'active' then
      update public.profiles set role = 'teacher' where id = new.user_id;
    elsif new.status = 'suspended' then
      update public.profiles set role = 'student' where id = new.user_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists teacher_profiles_sync_role on public.teacher_profiles;
create trigger teacher_profiles_sync_role
  after update on public.teacher_profiles
  for each row execute function public.sync_role_with_teacher_status();

-- ------------------------------------------------------------
-- 2. Matrícula grátis via RLS
-- Só o service role (webhook do Stripe / rota de curso grátis
-- via createAdminClient) pode inserir matrícula.
-- ------------------------------------------------------------
drop policy if exists "enrollments_student_insert" on public.enrollments;

-- ------------------------------------------------------------
-- 3. Professor aprova o próprio curso
-- courses_teacher_own_all continua liberando o professor a editar
-- os próprios cursos, mas mudança de status só pode ir
-- draft -> pending_review (o resto é exclusivo do admin).
-- ------------------------------------------------------------
create or replace function public.guard_course_status_change()
returns trigger as $$
begin
  if new.status is distinct from old.status then
    if public.get_my_role() = 'admin' then
      return new;
    end if;
    if old.status = 'draft' and new.status = 'pending_review' then
      return new;
    end if;
    raise exception 'Alteração de status de curso não permitida (% -> %)', old.status, new.status;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists courses_guard_status_change on public.courses;
create trigger courses_guard_status_change
  before update on public.courses
  for each row execute function public.guard_course_status_change();

-- ------------------------------------------------------------
-- 4. stripe_account_id exposto publicamente
-- Troca a leitura pública da tabela inteira por uma view com
-- só as colunas que a página de curso precisa mostrar.
-- ------------------------------------------------------------
drop policy if exists "teacher_profiles_public_read" on public.teacher_profiles;

create or replace view public.teacher_profiles_public as
  select user_id, bio
  from public.teacher_profiles
  where status = 'active';

grant select on public.teacher_profiles_public to anon, authenticated;
