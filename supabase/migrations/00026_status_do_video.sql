-- ============================================================
-- Migration 00026: Status do vídeo da aula — 06/10/2026
-- Execute APÓS 00025_aulas_publicas.sql
--
-- Até aqui a aula só sabia se TINHA um bunny_video_id. Não sabia se o vídeo
-- ainda estava subindo, se o Bunny estava codificando, ou se o envio morreu no
-- meio — então o aluno via um player quebrado e o professor não via nada.
--
--   none        aula sem vídeo
--   uploading   objeto criado no Bunny, arquivo ainda subindo (ou abandonado)
--   processing  arquivo no Bunny, codificando
--   ready       pode ser assistido
--   failed      o Bunny recusou/errou, ou o envio nunca terminou
-- ============================================================

alter table public.lessons
  add column if not exists video_status text not null default 'none'
  check (video_status in ('none', 'uploading', 'processing', 'ready', 'failed'));

-- Aulas que já existem: com vídeo e duração conhecida, o webhook já rodou →
-- pronto. Com vídeo e sem duração, a primeira visita ao player ou ao painel
-- consulta o Bunny e acerta o status sozinha.
update public.lessons
set video_status = case
  when bunny_video_id is null then 'none'
  when duration_seconds is not null then 'ready'
  else 'processing'
end
where video_status = 'none' and bunny_video_id is not null;

-- O professor só enxerga o que é dele pela RLS de lessons; nenhuma policy nova
-- é necessária: a coluna acompanha a linha.
