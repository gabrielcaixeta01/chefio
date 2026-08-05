-- ============================================================
-- Migration 00002: Row Level Security (RLS)
-- Execute APÓS 00001_initial_schema.sql
-- ============================================================

-- Helper: retorna o role do usuário autenticado
create or replace function public.get_my_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- ============================================================
-- Habilitar RLS em todas as tabelas
-- ============================================================
alter table public.profiles enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_attachments enable row level security;
alter table public.products enable row level security;
alter table public.lesson_products enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.notebooks enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.teacher_payouts enable row level security;
alter table public.documents enable row level security;

-- ============================================================
-- PROFILES
-- ============================================================
drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (id = auth.uid());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (public.get_my_role() = 'admin');

-- Alunos e professores precisam ler profiles de professores (exibir nome do professor nos cursos)
drop policy if exists "profiles_teacher_public_read" on public.profiles;
create policy "profiles_teacher_public_read" on public.profiles
  for select using (role = 'teacher');

-- ============================================================
-- TEACHER_PROFILES
-- ============================================================
drop policy if exists "teacher_profiles_self_read" on public.teacher_profiles;
create policy "teacher_profiles_self_read" on public.teacher_profiles
  for select using (user_id = auth.uid());

drop policy if exists "teacher_profiles_self_update" on public.teacher_profiles;
create policy "teacher_profiles_self_update" on public.teacher_profiles
  for update using (user_id = auth.uid());

drop policy if exists "teacher_profiles_admin_all" on public.teacher_profiles;
create policy "teacher_profiles_admin_all" on public.teacher_profiles
  for all using (public.get_my_role() = 'admin');

-- Leitura pública para exibir bio do professor nas páginas de cursos
drop policy if exists "teacher_profiles_public_read" on public.teacher_profiles;
create policy "teacher_profiles_public_read" on public.teacher_profiles
  for select using (status = 'active');

-- ============================================================
-- COURSES
-- ============================================================
drop policy if exists "courses_public_approved_read" on public.courses;
create policy "courses_public_approved_read" on public.courses
  for select using (status = 'approved');

drop policy if exists "courses_teacher_own_all" on public.courses;
create policy "courses_teacher_own_all" on public.courses
  for all using (
    teacher_id = auth.uid() and public.get_my_role() = 'teacher'
  );

drop policy if exists "courses_admin_all" on public.courses;
create policy "courses_admin_all" on public.courses
  for all using (public.get_my_role() = 'admin');

-- ============================================================
-- LESSONS
-- ============================================================
-- Preview gratuito: qualquer pessoa pode ler
drop policy if exists "lessons_free_preview_read" on public.lessons;
create policy "lessons_free_preview_read" on public.lessons
  for select using (is_free_preview = true);

-- Aluno matriculado pode ler todas as aulas
drop policy if exists "lessons_enrolled_student_read" on public.lessons;
create policy "lessons_enrolled_student_read" on public.lessons
  for select using (
    exists (
      select 1 from public.enrollments
      where enrollments.course_id = lessons.course_id
        and enrollments.student_id = auth.uid()
    )
  );

-- Professor gerencia aulas dos seus cursos
drop policy if exists "lessons_teacher_manage" on public.lessons;
create policy "lessons_teacher_manage" on public.lessons
  for all using (
    exists (
      select 1 from public.courses
      where courses.id = lessons.course_id
        and courses.teacher_id = auth.uid()
    )
  );

drop policy if exists "lessons_admin_all" on public.lessons;
create policy "lessons_admin_all" on public.lessons
  for all using (public.get_my_role() = 'admin');

-- ============================================================
-- LESSON_ATTACHMENTS
-- ============================================================
drop policy if exists "lesson_attachments_enrolled_read" on public.lesson_attachments;
create policy "lesson_attachments_enrolled_read" on public.lesson_attachments
  for select using (
    exists (
      select 1 from public.lessons l
      join public.enrollments e on e.course_id = l.course_id
      where l.id = lesson_attachments.lesson_id
        and e.student_id = auth.uid()
    )
  );

drop policy if exists "lesson_attachments_teacher_manage" on public.lesson_attachments;
create policy "lesson_attachments_teacher_manage" on public.lesson_attachments
  for all using (
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_attachments.lesson_id
        and c.teacher_id = auth.uid()
    )
  );

drop policy if exists "lesson_attachments_admin_all" on public.lesson_attachments;
create policy "lesson_attachments_admin_all" on public.lesson_attachments
  for all using (public.get_my_role() = 'admin');

-- ============================================================
-- PRODUCTS
-- ============================================================
drop policy if exists "products_public_active_read" on public.products;
create policy "products_public_active_read" on public.products
  for select using (is_active = true);

drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all" on public.products
  for all using (public.get_my_role() = 'admin');

-- ============================================================
-- LESSON_PRODUCTS
-- ============================================================
drop policy if exists "lesson_products_public_read" on public.lesson_products;
create policy "lesson_products_public_read" on public.lesson_products
  for select using (true);

drop policy if exists "lesson_products_teacher_manage" on public.lesson_products;
create policy "lesson_products_teacher_manage" on public.lesson_products
  for all using (
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_products.lesson_id
        and c.teacher_id = auth.uid()
    )
  );

drop policy if exists "lesson_products_admin_all" on public.lesson_products;
create policy "lesson_products_admin_all" on public.lesson_products
  for all using (public.get_my_role() = 'admin');

-- ============================================================
-- ENROLLMENTS
-- ============================================================
drop policy if exists "enrollments_student_own_read" on public.enrollments;
create policy "enrollments_student_own_read" on public.enrollments
  for select using (student_id = auth.uid());

drop policy if exists "enrollments_student_insert" on public.enrollments;
create policy "enrollments_student_insert" on public.enrollments
  for insert with check (student_id = auth.uid());

-- Professor vê matrículas dos seus cursos
drop policy if exists "enrollments_teacher_own_courses_read" on public.enrollments;
create policy "enrollments_teacher_own_courses_read" on public.enrollments
  for select using (
    exists (
      select 1 from public.courses
      where courses.id = enrollments.course_id
        and courses.teacher_id = auth.uid()
    )
  );

drop policy if exists "enrollments_admin_all" on public.enrollments;
create policy "enrollments_admin_all" on public.enrollments
  for all using (public.get_my_role() = 'admin');

-- ============================================================
-- LESSON_PROGRESS
-- ============================================================
drop policy if exists "lesson_progress_student_own" on public.lesson_progress;
create policy "lesson_progress_student_own" on public.lesson_progress
  for all using (student_id = auth.uid());

drop policy if exists "lesson_progress_admin_all" on public.lesson_progress;
create policy "lesson_progress_admin_all" on public.lesson_progress
  for all using (public.get_my_role() = 'admin');

-- ============================================================
-- NOTEBOOKS
-- ============================================================
drop policy if exists "notebooks_student_own" on public.notebooks;
create policy "notebooks_student_own" on public.notebooks
  for all using (student_id = auth.uid());

-- ============================================================
-- ORDERS
-- ============================================================
drop policy if exists "orders_student_own_read" on public.orders;
create policy "orders_student_own_read" on public.orders
  for select using (student_id = auth.uid());

drop policy if exists "orders_student_insert" on public.orders;
create policy "orders_student_insert" on public.orders
  for insert with check (student_id = auth.uid());

drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all" on public.orders
  for all using (public.get_my_role() = 'admin');

-- ============================================================
-- ORDER_ITEMS
-- ============================================================
drop policy if exists "order_items_student_own_read" on public.order_items;
create policy "order_items_student_own_read" on public.order_items
  for select using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.student_id = auth.uid()
    )
  );

drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all" on public.order_items
  for all using (public.get_my_role() = 'admin');

-- ============================================================
-- TEACHER_PAYOUTS
-- ============================================================
drop policy if exists "payouts_teacher_own_read" on public.teacher_payouts;
create policy "payouts_teacher_own_read" on public.teacher_payouts
  for select using (teacher_id = auth.uid());

drop policy if exists "payouts_admin_all" on public.teacher_payouts;
create policy "payouts_admin_all" on public.teacher_payouts
  for all using (public.get_my_role() = 'admin');

-- ============================================================
-- DOCUMENTS
-- ============================================================
drop policy if exists "documents_teacher_own" on public.documents;
create policy "documents_teacher_own" on public.documents
  for all using (teacher_id = auth.uid());

drop policy if exists "documents_admin_all" on public.documents;
create policy "documents_admin_all" on public.documents
  for all using (public.get_my_role() = 'admin');
