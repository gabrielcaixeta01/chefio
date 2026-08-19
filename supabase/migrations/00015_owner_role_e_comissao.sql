-- ============================================================
-- Migration 00015: Papel 'owner' + comissão padrão 15% (19/08/2026)
-- Execute APÓS 00014_fix_get_my_role_grant.sql
--
-- Decisões de negócio implementadas aqui:
--   1.1 — a comissão da plataforma passa a ser 15% (era 20%).
--   1.2 — só o perfil dono/financeiro altera comissão, e toda alteração
--         fica registrada (quem, quando, de quanto pra quanto).
--
-- Para promover alguém a dono depois de rodar esta migration:
--   update public.profiles set role = 'owner' where id = '<uuid>';
-- ============================================================

-- ------------------------------------------------------------
-- 1. Papel 'owner'
-- ------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('owner', 'admin', 'teacher', 'student'));

-- get_my_role() é o gate de ~48 policies escritas como `= 'admin'`. O owner é
-- um admin com poderes a mais, não um papel paralelo — então ele continua
-- respondendo 'admin' para o owner e nenhuma policy existente precisa mudar.
-- Quem precisa distinguir os dois usa get_my_raw_role().
create or replace function public.get_my_raw_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function public.get_my_role()
returns text as $$
  select case when role = 'owner' then 'admin' else role end
  from public.profiles where id = auth.uid();
$$ language sql security definer stable;

grant execute on function public.get_my_raw_role() to anon, authenticated, service_role;
grant execute on function public.get_my_role() to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 2. Registro de alteração de comissão (1.2)
-- ------------------------------------------------------------
create table if not exists public.commission_changes (
  id uuid primary key default gen_random_uuid(),
  teacher_profile_id uuid not null references public.teacher_profiles(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  old_rate numeric(5,2) not null,
  new_rate numeric(5,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_commission_changes_teacher
  on public.commission_changes(teacher_profile_id, created_at desc);

alter table public.commission_changes enable row level security;

-- Só leitura, e só para o staff. Ninguém escreve pelo client: as linhas saem
-- do trigger abaixo (security definer), que não passa por RLS.
drop policy if exists "commission_changes_admin_read" on public.commission_changes;
create policy "commission_changes_admin_read" on public.commission_changes
  for select using ((select public.get_my_role()) = 'admin');

create or replace function public.log_commission_change()
returns trigger as $$
begin
  if new.commission_rate is distinct from old.commission_rate then
    insert into public.commission_changes (teacher_profile_id, changed_by, old_rate, new_rate)
    values (new.id, auth.uid(), old.commission_rate, new.commission_rate);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists teacher_profiles_log_commission on public.teacher_profiles;
create trigger teacher_profiles_log_commission
  after update on public.teacher_profiles
  for each row execute function public.log_commission_change();

-- ------------------------------------------------------------
-- 3. Comissão só o owner altera (substitui a guarda da 00007)
-- ------------------------------------------------------------
create or replace function public.guard_teacher_profile_admin_columns()
returns trigger as $$
begin
  -- service_role (webhook, scripts de migração) não tem auth.uid() e é confiável.
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

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ------------------------------------------------------------
-- 4. Comissão padrão 15% (1.1)
-- ------------------------------------------------------------
alter table public.teacher_profiles alter column commission_rate set default 15.00;

-- Pré-lançamento: ninguém tem contrato assinado em 20%, e a decisão 1.3 diz
-- que a taxa nova vale para vendas futuras — as matrículas já fechadas guardam
-- o valor pago, não a taxa, então nada retroage.
update public.teacher_profiles
set commission_rate = 15.00
where commission_rate = 20.00;
