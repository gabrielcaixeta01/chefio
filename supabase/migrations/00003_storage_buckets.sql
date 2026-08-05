-- ============================================================
-- Migration 00003: Storage Buckets e Políticas
-- Execute APÓS 00002_rls_policies.sql
-- OBS: Buckets devem ser criados manualmente no dashboard do Supabase
--      em Storage > New bucket, depois execute este SQL para as policies
-- ============================================================

-- Buckets a criar manualmente no Supabase Dashboard:
-- 1. "thumbnails"  — público, para capas de cursos
-- 2. "documents"   — privado, para PDFs dos professores
-- 3. "attachments" — privado, para arquivos das aulas
-- 4. "avatars"     — público, para fotos de perfil

-- ============================================================
-- thumbnails (público)
-- ============================================================
drop policy if exists "thumbnails_public_read" on storage.objects;
create policy "thumbnails_public_read" on storage.objects
  for select using (bucket_id = 'thumbnails');

drop policy if exists "thumbnails_teacher_upload" on storage.objects;
create policy "thumbnails_teacher_upload" on storage.objects
  for insert with check (
    bucket_id = 'thumbnails'
    and public.get_my_role() in ('teacher', 'admin')
  );

drop policy if exists "thumbnails_teacher_update" on storage.objects;
create policy "thumbnails_teacher_update" on storage.objects
  for update using (
    bucket_id = 'thumbnails'
    and public.get_my_role() in ('teacher', 'admin')
  );

drop policy if exists "thumbnails_teacher_delete" on storage.objects;
create policy "thumbnails_teacher_delete" on storage.objects
  for delete using (
    bucket_id = 'thumbnails'
    and public.get_my_role() in ('teacher', 'admin')
  );

-- ============================================================
-- avatars (público)
-- ============================================================
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_self_upload" on storage.objects;
create policy "avatars_self_upload" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_self_update" on storage.objects;
create policy "avatars_self_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- documents (privado — apenas o professor dono)
-- ============================================================
drop policy if exists "documents_teacher_own_select" on storage.objects;
create policy "documents_teacher_own_select" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_teacher_own_insert" on storage.objects;
create policy "documents_teacher_own_insert" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.get_my_role() = 'teacher'
  );

drop policy if exists "documents_teacher_own_delete" on storage.objects;
create policy "documents_teacher_own_delete" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_admin_all" on storage.objects;
create policy "documents_admin_all" on storage.objects
  for all using (
    bucket_id = 'documents'
    and public.get_my_role() = 'admin'
  );

-- ============================================================
-- attachments (privado — apenas aluno matriculado ou professor)
-- ============================================================
drop policy if exists "attachments_upload" on storage.objects;
create policy "attachments_upload" on storage.objects
  for insert with check (
    bucket_id = 'attachments'
    and public.get_my_role() in ('teacher', 'admin')
  );

drop policy if exists "attachments_admin_all" on storage.objects;
create policy "attachments_admin_all" on storage.objects
  for all using (
    bucket_id = 'attachments'
    and public.get_my_role() = 'admin'
  );
-- Nota: acesso de alunos aos attachments é feito via signed URLs geradas server-side
