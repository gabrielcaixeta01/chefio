-- ============================================================
-- Migration 00025: Currículo visível na página de venda (21/08/2026)
-- Execute APÓS 00024_fix_recursao_courses_enrollments.sql
--
-- SINTOMA
--   A página pública do curso anunciava "1 aula" e listava um currículo de
--   um item só em cursos que têm 5. No banco: 58 aulas no catálogo, das
--   quais 13 marcadas como prévia gratuita.
--
-- CAUSA
--   A única policy de leitura de `lessons` que alcança o visitante anônimo é
--   `lessons_free_preview_read` (00002), que libera `is_free_preview = true`
--   e mais nada. As outras exigem matrícula, ser o professor ou ser admin.
--   Então o anônimo enxergava exatamente as prévias — e a página contava o
--   que enxergava.
--
--   Ou seja: quem chega para comprar via o produto com 1/5 do tamanho real.
--   Não é bug visual, é a vitrine subdimensionando a mercadoria.
--
-- CORREÇÃO
--   Mesma solução que a 00003 deu para `teacher_profiles`: em vez de abrir a
--   tabela, publicar uma view com as colunas que a vitrine precisa. O que
--   fica de fora é o que importa — `bunny_video_id`. Metadado de aula
--   (título, duração, ordem) é material de venda; o ponteiro do vídeo não,
--   e liberar a linha inteira por RLS entregaria os dois juntos, porque RLS
--   filtra linha e não coluna.
--
--   A view roda como dona (postgres), então não passa por RLS e não reentra
--   nas policies de `courses` — funciona inclusive num banco que ainda não
--   recebeu a 00024.
-- ============================================================

create or replace view public.lessons_publicas as
  select
    l.id,
    l.course_id,
    l.title,
    l.duration_seconds,
    l.is_free_preview,
    l.order_index
  from public.lessons l
  join public.courses c on c.id = l.course_id
  -- O recorte da vitrine, igual ao de `courses_public_approved_read`:
  -- curso em revisão ou arquivado não tem currículo público.
  where c.status = 'approved'
    and c.archived_at is null;

grant select on public.lessons_publicas to anon, authenticated;

-- Índice para o catálogo, que puxa as aulas de 12 cursos de uma vez.
create index if not exists idx_lessons_course_ordem
  on public.lessons (course_id, order_index);
