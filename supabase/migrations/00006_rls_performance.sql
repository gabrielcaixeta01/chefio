-- ============================================================
-- Migration 00006: Performance de RLS + índices faltando (05/08/2026)
-- Execute APÓS 00005_role_jwt_sync.sql
-- ============================================================

-- ------------------------------------------------------------
-- get_my_role() e auth.uid() reavaliados por linha
-- Envolver em subquery vira um InitPlan — o Postgres resolve uma vez
-- por statement em vez de uma vez por linha varrida. Recomendação
-- oficial do Supabase (https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select).
-- ------------------------------------------------------------

-- PROFILES
alter policy "profiles_self_read" on public.profiles
  using (id = (select auth.uid()));
alter policy "profiles_self_update" on public.profiles
  using (id = (select auth.uid()));
alter policy "profiles_admin_all" on public.profiles
  using ((select public.get_my_role()) = 'admin');

-- TEACHER_PROFILES
alter policy "teacher_profiles_self_read" on public.teacher_profiles
  using (user_id = (select auth.uid()));
alter policy "teacher_profiles_self_update" on public.teacher_profiles
  using (user_id = (select auth.uid()));
alter policy "teacher_profiles_admin_all" on public.teacher_profiles
  using ((select public.get_my_role()) = 'admin');

-- COURSES
alter policy "courses_teacher_own_all" on public.courses
  using (
    teacher_id = (select auth.uid()) and (select public.get_my_role()) = 'teacher'
  );
alter policy "courses_admin_all" on public.courses
  using ((select public.get_my_role()) = 'admin');

-- LESSONS
alter policy "lessons_enrolled_student_read" on public.lessons
  using (
    exists (
      select 1 from public.enrollments
      where enrollments.course_id = lessons.course_id
        and enrollments.student_id = (select auth.uid())
    )
  );
alter policy "lessons_teacher_manage" on public.lessons
  using (
    exists (
      select 1 from public.courses
      where courses.id = lessons.course_id
        and courses.teacher_id = (select auth.uid())
    )
  );
alter policy "lessons_admin_all" on public.lessons
  using ((select public.get_my_role()) = 'admin');

-- LESSON_ATTACHMENTS
alter policy "lesson_attachments_enrolled_read" on public.lesson_attachments
  using (
    exists (
      select 1 from public.lessons l
      join public.enrollments e on e.course_id = l.course_id
      where l.id = lesson_attachments.lesson_id
        and e.student_id = (select auth.uid())
    )
  );
alter policy "lesson_attachments_teacher_manage" on public.lesson_attachments
  using (
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_attachments.lesson_id
        and c.teacher_id = (select auth.uid())
    )
  );
alter policy "lesson_attachments_admin_all" on public.lesson_attachments
  using ((select public.get_my_role()) = 'admin');

-- PRODUCTS
alter policy "products_admin_all" on public.products
  using ((select public.get_my_role()) = 'admin');

-- LESSON_PRODUCTS
alter policy "lesson_products_teacher_manage" on public.lesson_products
  using (
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_products.lesson_id
        and c.teacher_id = (select auth.uid())
    )
  );
alter policy "lesson_products_admin_all" on public.lesson_products
  using ((select public.get_my_role()) = 'admin');

-- ENROLLMENTS
alter policy "enrollments_student_own_read" on public.enrollments
  using (student_id = (select auth.uid()));
alter policy "enrollments_teacher_own_courses_read" on public.enrollments
  using (
    exists (
      select 1 from public.courses
      where courses.id = enrollments.course_id
        and courses.teacher_id = (select auth.uid())
    )
  );
alter policy "enrollments_admin_all" on public.enrollments
  using ((select public.get_my_role()) = 'admin');

-- LESSON_PROGRESS
alter policy "lesson_progress_student_own" on public.lesson_progress
  using (student_id = (select auth.uid()));
alter policy "lesson_progress_admin_all" on public.lesson_progress
  using ((select public.get_my_role()) = 'admin');

-- NOTEBOOKS
alter policy "notebooks_student_own" on public.notebooks
  using (student_id = (select auth.uid()));

-- ORDERS
alter policy "orders_student_own_read" on public.orders
  using (student_id = (select auth.uid()));
alter policy "orders_student_insert" on public.orders
  with check (student_id = (select auth.uid()));
alter policy "orders_admin_all" on public.orders
  using ((select public.get_my_role()) = 'admin');

-- ORDER_ITEMS
alter policy "order_items_student_own_read" on public.order_items
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.student_id = (select auth.uid())
    )
  );
alter policy "order_items_admin_all" on public.order_items
  using ((select public.get_my_role()) = 'admin');

-- TEACHER_PAYOUTS
alter policy "payouts_teacher_own_read" on public.teacher_payouts
  using (teacher_id = (select auth.uid()));
alter policy "payouts_admin_all" on public.teacher_payouts
  using ((select public.get_my_role()) = 'admin');

-- DOCUMENTS
alter policy "documents_teacher_own" on public.documents
  using (teacher_id = (select auth.uid()));
alter policy "documents_admin_all" on public.documents
  using ((select public.get_my_role()) = 'admin');

-- ------------------------------------------------------------
-- Índices faltando — todas essas colunas são filtradas em policies
-- (as próprias acima) ou em queries de página.
-- ------------------------------------------------------------
create index if not exists idx_orders_student_id on public.orders(student_id);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_teacher_payouts_teacher_id on public.teacher_payouts(teacher_id);
create index if not exists idx_documents_teacher_id on public.documents(teacher_id);
