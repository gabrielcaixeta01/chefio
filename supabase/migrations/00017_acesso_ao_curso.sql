-- ============================================================
-- Migration 00017: Acesso ao curso (Seção 3) — 19/08/2026
-- Execute APÓS 00016_reembolso_e_cupons.sql
--
-- Decisões de negócio implementadas aqui:
--   3.1/3.2 — acesso vitalício: quem comprou continua vendo o curso mesmo
--             que ele saia do catálogo ou que o professor saia da plataforma.
--   3.3     — curso com aluno matriculado não pode ser apagado. Só arquivado.
--   3.4     — remover uma aula ou trocar o vídeo de um curso já vendido
--             depende de aprovação do admin.
--   3.6     — no máximo 2 sessões simultâneas por conta.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Arquivamento de curso (3.3)
--    Tirar do catálogo é uma coisa; apagar é outra. `archived_at` é o
--    "tirar do catálogo" — o curso some da vitrine e não pode mais ser
--    comprado, mas continua existindo para quem já pagou.
-- ------------------------------------------------------------
alter table public.courses
  add column if not exists archived_at timestamptz;

create index if not exists idx_courses_catalogo
  on public.courses (created_at desc)
  where status = 'approved' and archived_at is null;

-- Vitrine pública deixa de enxergar o arquivado.
alter policy "courses_public_approved_read" on public.courses
  using (status = 'approved' and archived_at is null);

-- E aqui mora a promessa do "acesso vitalício" (3.1): a leitura do curso pelo
-- aluno matriculado não olha status nem arquivamento nem a situação do
-- professor (3.2) — olha só a matrícula viva. Sem esta policy, despublicar um
-- curso apagava ele da biblioteca de quem pagou, porque a única leitura que
-- existia era a pública (`status = 'approved'`).
drop policy if exists "courses_enrolled_student_read" on public.courses;
create policy "courses_enrolled_student_read" on public.courses
  for select using (
    -- O `auth.uid() is not null` corta a subquery na vitrine pública, que é
    -- onde esta policy roda contra o catálogo inteiro (mesma preocupação da
    -- 00006_rls_performance).
    (select auth.uid()) is not null
    and exists (
      select 1 from public.enrollments e
      where e.course_id = courses.id
        and e.student_id = (select auth.uid())
        and e.refunded_at is null
    )
  );

-- ------------------------------------------------------------
-- 2. Curso vendido não se apaga (3.3)
--    Sem escape para service_role de propósito: apagar leva junto aulas,
--    progresso e caderno de todo mundo (cascade), e não existe cenário de
--    suporte que justifique isso — arquivar resolve o mesmo problema sem
--    destruir o que o aluno comprou.
--
--    Efeito colateral desejado: profiles -> courses é `on delete cascade`,
--    então apagar a conta de um professor com curso vendido também falha.
--    É exatamente a decisão 3.2 (o aluno continua assistindo).
-- ------------------------------------------------------------
create or replace function public.guard_course_delete()
returns trigger as $$
begin
  if exists (
    select 1 from public.enrollments e
    where e.course_id = old.id and e.refunded_at is null
  ) then
    raise exception 'Este curso tem alunos matriculados e não pode ser excluído. Tire do catálogo — quem comprou continua com acesso.';
  end if;
  return old;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists courses_guard_delete on public.courses;
create trigger courses_guard_delete
  before delete on public.courses
  for each row execute function public.guard_course_delete();

-- ------------------------------------------------------------
-- 3. Aula de curso vendido só muda com aprovação (3.4)
-- ------------------------------------------------------------
create or replace function public.curso_tem_aluno(p_course_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.enrollments e
    where e.course_id = p_course_id and e.refunded_at is null
  );
$$ language sql security definer stable set search_path = public;

grant execute on function public.curso_tem_aluno(uuid) to authenticated, service_role;

-- O que trava é só o que faz o aluno PERDER algo: apagar a aula e trocar o
-- vídeo que já está no ar. Título, descrição, ordem, anexos e aula nova
-- continuam livres — melhorar o curso não precisa de burocracia.
create or replace function public.guard_lesson_change()
returns trigger as $$
declare
  v_course_id uuid;
begin
  if tg_op = 'DELETE' then
    v_course_id := old.course_id;
  else
    v_course_id := new.course_id;
  end if;

  -- service_role (rota que aplica a aprovação, webhook do Bunny) roda sem
  -- auth.uid(). É por ali que a mudança aprovada entra.
  if auth.uid() is null or (select public.get_my_role()) = 'admin' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if not public.curso_tem_aluno(v_course_id) then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Curso já vendido: a remoção da aula precisa de aprovação do admin.';
  end if;

  if new.bunny_video_id is distinct from old.bunny_video_id
     and old.bunny_video_id is not null then
    raise exception 'Curso já vendido: a troca do vídeo precisa de aprovação do admin.';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists lessons_guard_change on public.lessons;
create trigger lessons_guard_change
  before update or delete on public.lessons
  for each row execute function public.guard_lesson_change();

-- ------------------------------------------------------------
-- 4. Fila de aprovação das mudanças (3.4)
-- ------------------------------------------------------------
create table if not exists public.lesson_change_requests (
  id uuid primary key default gen_random_uuid(),
  -- `set null` e não `cascade`: quando a remoção é aprovada a aula some, e o
  -- pedido precisa sobreviver como registro de quem autorizou o quê.
  lesson_id uuid references public.lessons(id) on delete set null,
  lesson_title text not null,
  course_id uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('remove', 'replace_video')),
  -- Vídeo novo já enviado ao Bunny, esperando aval. O antigo continua no ar
  -- até o admin aprovar — o aluno nunca vê a aula quebrada no meio.
  new_bunny_video_id text,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_lcr_pendentes
  on public.lesson_change_requests (created_at asc)
  where status = 'pending';

-- Um pedido em aberto por aula. Reenviar um vídeo novo por cima substitui o
-- pedido anterior (a rota apaga o pendente antes de criar o novo).
create unique index if not exists idx_lcr_um_pendente_por_aula
  on public.lesson_change_requests (lesson_id)
  where status = 'pending';

alter table public.lesson_change_requests enable row level security;

drop policy if exists "lcr_teacher_read" on public.lesson_change_requests;
create policy "lcr_teacher_read" on public.lesson_change_requests
  for select using (teacher_id = (select auth.uid()));

drop policy if exists "lcr_teacher_insert" on public.lesson_change_requests;
create policy "lcr_teacher_insert" on public.lesson_change_requests
  for insert with check (
    teacher_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.teacher_id = (select auth.uid())
    )
  );

-- Desistir do pedido enquanto ninguém olhou. Depois de decidido vira histórico
-- e nem o professor apaga.
drop policy if exists "lcr_teacher_cancel" on public.lesson_change_requests;
create policy "lcr_teacher_cancel" on public.lesson_change_requests
  for delete using (teacher_id = (select auth.uid()) and status = 'pending');

drop policy if exists "lcr_admin_all" on public.lesson_change_requests;
create policy "lcr_admin_all" on public.lesson_change_requests
  for all using ((select public.get_my_role()) = 'admin');

-- ------------------------------------------------------------
-- 5. Duas sessões simultâneas por conta (3.6)
--    O Supabase não limita sessão no plano em uso, então o controle é nosso:
--    o middleware carimba a sessão a cada passagem e esta função decide quem
--    fica. `session_id` vem do claim do próprio JWT.
-- ------------------------------------------------------------
create table if not exists public.active_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_agent text,
  -- Marcar em vez de apagar: a sessão derrubada que fosse apagada se
  -- reinseriria na navegação seguinte e derrubaria outra, num revezamento
  -- infinito entre os aparelhos.
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_active_sessions_user
  on public.active_sessions (user_id, last_seen_at desc)
  where revoked_at is null;

alter table public.active_sessions enable row level security;

-- Leitura só da própria conta (a tela "aparelhos conectados" sai daqui).
-- Escrita ninguém tem: quem mexe é touch_session(), security definer.
drop policy if exists "active_sessions_own_read" on public.active_sessions;
create policy "active_sessions_own_read" on public.active_sessions
  for select using (user_id = (select auth.uid()));

create or replace function public.touch_session(
  p_session_id uuid,
  p_user_agent text default null
)
returns boolean as $$
declare
  v_user uuid := auth.uid();
  v_revogada timestamptz;
begin
  if v_user is null then
    return true;
  end if;

  insert into public.active_sessions (session_id, user_id, user_agent)
  values (p_session_id, v_user, p_user_agent)
  on conflict (session_id) do update
    set last_seen_at = case
          when active_sessions.revoked_at is null then now()
          else active_sessions.last_seen_at
        end,
        user_agent = coalesce(excluded.user_agent, active_sessions.user_agent)
  returning revoked_at into v_revogada;

  if v_revogada is not null then
    return false;
  end if;

  -- Passou de 2: cai a que está parada há mais tempo. Ordenar por
  -- `last_seen_at` (e não por `created_at`) é o que garante que quem está
  -- assistindo agora não é derrubado por um login novo em outro aparelho.
  update public.active_sessions
  set revoked_at = now()
  where user_id = v_user
    and revoked_at is null
    and session_id <> p_session_id
    and session_id not in (
      select s.session_id from public.active_sessions s
      where s.user_id = v_user and s.revoked_at is null
      order by s.last_seen_at desc
      limit 2
    );

  -- Faxina oportunista: sessão que não aparece há dois meses já expirou no
  -- Auth de qualquer jeito.
  delete from public.active_sessions
  where user_id = v_user and last_seen_at < now() - interval '60 days';

  return true;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.touch_session(uuid, text) from anon;
grant execute on function public.touch_session(uuid, text) to authenticated;
