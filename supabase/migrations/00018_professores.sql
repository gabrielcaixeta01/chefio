-- ============================================================
-- Migration 00018: Professores (Seção 4) — 19/08/2026
-- Execute APÓS 00017_acesso_ao_curso.sql
--
-- Decisões implementadas aqui:
--   4.2 — aprovar professor deixa de ser um botão no escuro: a candidatura
--         traz documento, telefone, portfólio e experiência.
--   4.3 — a mesma conta é aluna e professora. Nada aqui no banco impedia
--         (matrícula é por student_id, sem olhar role) — o que faltava era
--         deixar um aluno se candidatar sem precisar de um segundo e-mail.
--   4.4 — professor suspenso sai do catálogo na hora; quem comprou continua.
--   4.5 — exclusividade aceita e datada na candidatura.
-- ============================================================

-- ------------------------------------------------------------
-- 1. A candidatura (4.2 e 4.5)
-- ------------------------------------------------------------
alter table public.teacher_profiles
  add column if not exists document text,             -- CPF ou CNPJ
  add column if not exists phone text,
  add column if not exists portfolio_url text,
  add column if not exists experience text,
  add column if not exists submitted_at timestamptz,
  add column if not exists exclusivity_accepted_at timestamptz,  -- 4.5
  add column if not exists rejection_reason text,
  add column if not exists reviewed_by uuid,          -- sem FK: evita o embed
  add column if not exists reviewed_at timestamptz;   -- ambíguo no PostgREST

-- 'rejected' é diferente de 'suspended': recusado nunca chegou a dar aula.
alter table public.teacher_profiles drop constraint if exists teacher_profiles_status_check;
alter table public.teacher_profiles add constraint teacher_profiles_status_check
  check (status in ('pending', 'active', 'suspended', 'rejected'));

-- ------------------------------------------------------------
-- 2. Aluno se candidata a professor sem abrir outra conta (4.3)
--    Faltava policy de insert: quem se cadastrou como aluno e depois quis
--    ensinar não tinha como criar a própria linha.
-- ------------------------------------------------------------
drop policy if exists "teacher_profiles_self_insert" on public.teacher_profiles;
create policy "teacher_profiles_self_insert" on public.teacher_profiles
  for insert with check (user_id = (select auth.uid()));

-- A policy diz quem insere; o trigger diz com quê. Sem ele, um insert do
-- próprio usuário podia chegar com status='active' (o sync_role promoveria
-- na hora) ou commission_rate=0.
create or replace function public.guard_teacher_profile_insert()
returns trigger as $$
begin
  -- service_role (seed, importação, painel do Supabase) segue livre.
  if auth.uid() is null or (select public.get_my_role()) = 'admin' then
    return new;
  end if;

  new.status := 'pending';
  new.commission_rate := 15.00;
  new.stripe_account_id := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.rejection_reason := null;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists teacher_profiles_guard_insert on public.teacher_profiles;
create trigger teacher_profiles_guard_insert
  before insert on public.teacher_profiles
  for each row execute function public.guard_teacher_profile_insert();

-- ------------------------------------------------------------
-- 3. Aprovar exige ter olhado alguma coisa (4.2)
--    Só na transição pending -> active: reativar um suspenso antigo, que se
--    cadastrou antes desta migration, continua funcionando.
-- ------------------------------------------------------------
create or replace function public.guard_teacher_profile_admin_columns()
returns trigger as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.commission_rate is distinct from old.commission_rate
     and (select public.get_my_raw_role()) is distinct from 'owner' then
    raise exception 'Só o perfil dono/financeiro pode alterar a comissão.';
  end if;

  if new.status is distinct from old.status
     and (select public.get_my_role()) is distinct from 'admin' then
    raise exception 'Alteração de status não permitida.';
  end if;

  if old.status = 'pending' and new.status = 'active'
     and (new.document is null or new.submitted_at is null) then
    raise exception 'Este professor ainda não enviou a candidatura (documento e dados de contato).';
  end if;

  -- Dados da candidatura são do candidato, não do admin: sem isto o painel
  -- podia reescrever o documento de alguém.
  if (select public.get_my_role()) = 'admin'
     and (select auth.uid()) is distinct from old.user_id
     and (new.document is distinct from old.document
          or new.experience is distinct from old.experience
          or new.portfolio_url is distinct from old.portfolio_url) then
    raise exception 'Os dados da candidatura só o próprio professor altera.';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ------------------------------------------------------------
-- 4. Professor suspenso sai do catálogo (4.4)
--    `not exists (suspended|rejected)` e não `exists (active)`: curso cujo
--    professor não tem linha em teacher_profiles (seed, conta antiga) sumiria
--    do catálogo inteiro na virada da policy.
--
--    O que NÃO muda: courses_enrolled_student_read (00017) não olha o
--    professor, então quem comprou continua assistindo — é a outra metade
--    da decisão 4.4.
-- ------------------------------------------------------------
create index if not exists idx_teacher_profiles_fora
  on public.teacher_profiles (user_id)
  where status in ('suspended', 'rejected');

alter policy "courses_public_approved_read" on public.courses
  using (
    status = 'approved'
    and archived_at is null
    and not exists (
      select 1 from public.teacher_profiles tp
      where tp.user_id = courses.teacher_id
        and tp.status in ('suspended', 'rejected')
    )
  );

-- A view pública `teacher_profiles_public` (00003) já filtra status='active',
-- então a bio do suspenso some junto com o curso — nada a fazer aqui.
