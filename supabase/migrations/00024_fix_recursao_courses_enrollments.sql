-- ============================================================
-- Migration 00024: Quebra a recursão entre `courses` e `enrollments` (21/08/2026)
-- Execute APÓS 00023_fix_profiles_policy_recursion.sql
--
-- SINTOMA
--   Toda leitura de `courses` (e de `enrollments`, e de `lessons`, que passa
--   por elas) devolvia:
--
--       HTTP 500 — 42P17: infinite recursion detected in policy
--                  for relation "courses"
--
--   O catálogo público ficou fora do ar mostrando "Não foi possível carregar
--   o catálogo" — inclusive para visitante anônimo, que nem deveria encostar
--   nas policies de aluno ou professor.
--
-- CAUSA RAIZ
--   Referência mútua entre as policies das duas tabelas:
--
--       courses_enrolled_student_read      (00017) : courses  -> enrollments
--       enrollments_teacher_own_courses_read (00002): enrollments -> courses
--
--   O Postgres expande as policies na REESCRITA da consulta, antes de
--   executar qualquer coisa. Ao expandir `courses` ele entra em
--   `enrollments`, que manda de volta para `courses`, e aborta o ciclo com
--   42P17. Nada disso depende dos dados nem de quem consulta: o
--   `(select auth.uid()) is not null` que a 00017 usou como corte só
--   economiza execução, não impede a expansão. Por isso o anônimo quebrava
--   junto.
--
--   A 00023 leu o mesmo 42P17 e atribuiu o ciclo a `profiles`. Não era:
--   `get_my_role()` é `security definer` e portanto já não reentra em
--   `profiles`. O ciclo real sempre foi courses <-> enrollments, e continuou
--   de pé depois daquela migration.
--
-- CORREÇÃO
--   Cortar as duas pontas com funções `security definer`. Consulta feita
--   dentro de uma função `security definer` roda como a dona da função
--   (postgres), que não passa por RLS — a expansão para na função e o ciclo
--   deixa de existir. É o padrão recomendado pelo Supabase para policy que
--   precisa olhar outra tabela.
--
--   Uma ponta só já bastaria para matar o 42P17, mas as duas são cortadas de
--   propósito: enquanto a referência mútua existir no texto das policies,
--   qualquer migration futura que reintroduza a outra direção ressuscita o
--   bug inteiro.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Helpers que enxergam através do RLS
--
--    Ambas respondem apenas sobre QUEM CHAMA ("eu tenho matrícula neste
--    curso?", "este curso é meu?"), nunca sobre terceiros. Por isso podem
--    ser executáveis por anon/authenticated sem virar vazamento: não existe
--    argumento que faça a função contar algo sobre outra pessoa.
--
--    `set search_path` fixo é obrigatório em `security definer` — sem ele um
--    search_path hostil poderia apontar `public.enrollments` para outra
--    tabela e a função responderia o que o atacante quisesse.
-- ------------------------------------------------------------

-- Matrícula viva = comprou e não foi reembolsado. É a mesma condição da
-- 00017 (acesso vitalício, 3.1): não olha status do curso, nem
-- arquivamento, nem situação do professor.
create or replace function public.tem_matricula_ativa(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.enrollments e
    where e.course_id = p_course_id
      and e.student_id = auth.uid()
      and e.refunded_at is null
  );
$$;

create or replace function public.e_professor_do_curso(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.courses c
    where c.id = p_course_id
      and c.teacher_id = auth.uid()
  );
$$;

-- Expressão de RLS é avaliada COMO O PAPEL QUE CONSULTA, não como o dono da
-- tabela. Sem estes grants o catálogo troca o 42P17 por
-- "permission denied for function" — exatamente o incidente que a 00014
-- documenta. O `anon` precisa do grant mesmo nunca satisfazendo as policies:
-- o Postgres avalia as permissivas em conjunto.
grant execute on function public.tem_matricula_ativa(uuid) to anon, authenticated, service_role;
grant execute on function public.e_professor_do_curso(uuid) to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 2. courses -> enrollments : agora via função
--    Mantém a promessa de acesso vitalício (3.1/3.2) intacta; muda só o
--    caminho pelo qual a matrícula é consultada.
-- ------------------------------------------------------------
-- `drop`+`create` em vez de `alter policy`: `alter` exige que a policy já
-- exista e aborta a migration inteira num banco que não recebeu a 00017.
drop policy if exists "courses_enrolled_student_read" on public.courses;
create policy "courses_enrolled_student_read" on public.courses
  for select using (
    -- Corte barato para a vitrine pública: InitPlan avaliado uma vez, evita
    -- chamar a função linha a linha no catálogo inteiro (mesma preocupação
    -- da 00006_rls_performance).
    (select auth.uid()) is not null
    and public.tem_matricula_ativa(id)
  );

-- ------------------------------------------------------------
-- 3. enrollments -> courses : agora via função
-- ------------------------------------------------------------
drop policy if exists "enrollments_teacher_own_courses_read" on public.enrollments;
create policy "enrollments_teacher_own_courses_read" on public.enrollments
  for select using (
    (select auth.uid()) is not null
    and public.e_professor_do_curso(course_id)
  );

-- ------------------------------------------------------------
-- 4. Conferência
--    Depois de rodar, `courses` deve responder 200 para o papel anon.
--    Rodando aqui no editor você está como postgres (que ignora RLS), então
--    o teste que vale é o de fora:
--
--        curl -s -o /dev/null -w '%{http_code}\n' \
--          "$SUPABASE_URL/rest/v1/courses?select=id&limit=1" \
--          -H "apikey: $ANON_KEY"
--
--    200/206 = corrigido. 500 = ainda há ciclo.
-- ------------------------------------------------------------
