-- ============================================================
-- Migration 00001: Schema inicial da plataforma Chefio
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Trigger para auto-criar profile ao cadastrar usuário
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

-- ============================================================
-- TABELA: profiles (estende auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin', 'teacher', 'student')) default 'student',
  avatar_url text,
  created_at timestamptz default now()
);

-- ============================================================
-- TABELA: teacher_profiles
-- ============================================================
create table if not exists public.teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  bio text,
  stripe_account_id text unique,
  commission_rate numeric(5,2) not null default 20.00,
  status text not null check (status in ('pending', 'active', 'suspended')) default 'pending',
  created_at timestamptz default now()
);

-- ============================================================
-- TABELA: courses
-- ============================================================
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  slug text not null unique,
  description text,
  thumbnail_url text,
  price numeric(10,2) not null default 0,
  category text,
  status text not null check (status in ('draft','pending_review','approved','rejected')) default 'draft',
  rejection_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TABELA: lessons
-- ============================================================
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  bunny_video_id text,
  bunny_video_url text,
  duration_seconds integer,
  order_index integer not null default 0,
  is_free_preview boolean not null default false,
  created_at timestamptz default now()
);

-- ============================================================
-- TABELA: lesson_attachments
-- ============================================================
create table if not exists public.lesson_attachments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  name text not null,
  file_url text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- TABELA: products (loja — UI na fase 5)
-- ============================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null,
  image_url text,
  stock integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- ============================================================
-- TABELA: lesson_products (produtos recomendados por aula)
-- ============================================================
create table if not exists public.lesson_products (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (lesson_id, product_id)
);

-- ============================================================
-- TABELA: enrollments (matrículas)
-- ============================================================
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  stripe_payment_intent_id text,
  amount_paid numeric(10,2) not null default 0,
  created_at timestamptz default now(),
  unique (student_id, course_id)
);

-- ============================================================
-- TABELA: lesson_progress
-- ============================================================
create table if not exists public.lesson_progress (
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz,
  last_watched_seconds integer default 0,
  primary key (student_id, lesson_id)
);

-- ============================================================
-- TABELA: notebooks (caderno digital)
-- ============================================================
create table if not exists public.notebooks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  content jsonb,
  updated_at timestamptz default now(),
  unique (student_id, course_id)
);

-- ============================================================
-- TABELA: orders (pedidos da loja)
-- ============================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending','paid','shipped','delivered')) default 'pending',
  total numeric(10,2) not null,
  stripe_payment_intent_id text,
  created_at timestamptz default now()
);

-- ============================================================
-- TABELA: order_items
-- ============================================================
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null,
  unit_price numeric(10,2) not null
);

-- ============================================================
-- TABELA: teacher_payouts
-- ============================================================
create table if not exists public.teacher_payouts (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  status text not null check (status in ('pending','paid','failed')) default 'pending',
  stripe_transfer_id text,
  period_start date,
  period_end date,
  created_at timestamptz default now()
);

-- ============================================================
-- TABELA: documents (documentos do professor)
-- ============================================================
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  file_url text not null,
  file_type text,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_courses_teacher_id on public.courses(teacher_id);
create index if not exists idx_courses_status on public.courses(status);
create index if not exists idx_courses_slug on public.courses(slug);
create index if not exists idx_lessons_course_id on public.lessons(course_id);
create index if not exists idx_lessons_order on public.lessons(course_id, order_index);
create index if not exists idx_enrollments_student_id on public.enrollments(student_id);
create index if not exists idx_enrollments_course_id on public.enrollments(course_id);
create index if not exists idx_lesson_progress_student on public.lesson_progress(student_id);
create index if not exists idx_notebooks_student_course on public.notebooks(student_id, course_id);

-- ============================================================
-- TRIGGER para auto-criar profile no signup
-- ============================================================
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- TRIGGER: atualizar updated_at em courses
-- ============================================================
drop trigger if exists courses_updated_at on public.courses;
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger courses_updated_at
  before update on public.courses
  for each row execute function update_updated_at();
