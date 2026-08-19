-- ============================================================
-- Migration 00019: Revisão e publicação de curso (Seção 5) — 19/08/2026
-- Execute APÓS 00018_professores.sql
--
-- Decisões de negócio implementadas aqui:
--   5.1 — rejeitar exige motivo escrito, e o professor lê esse motivo.
--   5.5 — prazo de 2 dias úteis para revisar. O banco guarda a data de
--         envio; o prazo em si é calculado e mostrado na interface.
--
-- E corrige um bug antigo: o curso rejeitado não conseguia voltar pra fila.
-- A tela do professor oferecia "Enviar para revisão" de novo, mas a trigger
-- só aceitava `draft -> pending_review` — o professor corrigia o curso e
-- levava "Alteração de status de curso não permitida (rejected ->
-- pending_review)" na cara.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Carimbos da revisão
--    `reviewed_by` fica sem FK de propósito: `courses` já aponta pra
--    `profiles` por `teacher_id`, e uma segunda FK pra mesma tabela deixa o
--    embed do PostgREST ambíguo (PGRST200/201) em toda query que hoje faz
--    `teacher:profiles(name)`.
-- ------------------------------------------------------------
alter table public.courses
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid;

-- Curso que já está na fila hoje ficaria sem data de envio e apareceria como
-- "esperando desde sempre" pro admin. `updated_at` é o melhor palpite: o
-- último UPDATE naquela linha foi justamente o envio.
update public.courses
   set submitted_at = coalesce(updated_at, created_at)
 where status = 'pending_review'
   and submitted_at is null;

create index if not exists idx_courses_fila_revisao
  on public.courses (submitted_at)
  where status = 'pending_review';

-- ------------------------------------------------------------
-- 2. A trigger de status
--    Além de dizer quem pode mover o quê, agora ela é quem escreve as
--    colunas da revisão. Assim o cliente não precisa (nem consegue) mandar
--    `submitted_at`, `reviewed_at` ou um `rejection_reason` inventado.
-- ------------------------------------------------------------
create or replace function public.guard_course_status_change()
returns trigger as $$
declare
  papel text;
begin
  -- Service role e seed não têm sessão: passam direto, senão a carga inicial
  -- não conseguiria criar curso já aprovado.
  if auth.uid() is null then
    return new;
  end if;

  papel := public.get_my_role();

  if new.status is distinct from old.status then
    if papel = 'admin' then
      -- 5.1: rejeitar sem dizer por quê deixa o professor com "corrija os
      -- problemas indicados" e nenhum problema indicado.
      if new.status = 'rejected' and coalesce(btrim(new.rejection_reason), '') = '' then
        raise exception 'Escreva o motivo da rejeição — é o que o professor vai ler.';
      end if;

      if new.status <> 'rejected' then
        new.rejection_reason := null;
      end if;

      new.reviewed_at := now();
      new.reviewed_by := auth.uid();
      return new;
    end if;

    -- O professor só faz um movimento: mandar pra fila. De rascunho ou
    -- depois de corrigir o que foi rejeitado — este segundo caminho é o que
    -- faltava.
    if old.status in ('draft', 'rejected') and new.status = 'pending_review' then
      new.submitted_at := now();
      new.rejection_reason := null;
      new.reviewed_at := null;
      new.reviewed_by := null;
      return new;
    end if;

    raise exception 'Alteração de status de curso não permitida (% -> %)', old.status, new.status;
  end if;

  -- Sem mudança de status: editar o curso (5.3/5.4 — pode, e não volta pra
  -- revisão) não é desculpa pra reescrever o histórico da revisão.
  if papel <> 'admin' then
    new.rejection_reason := old.rejection_reason;
    new.submitted_at := old.submitted_at;
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists courses_guard_status_change on public.courses;
create trigger courses_guard_status_change
  before update on public.courses
  for each row execute function public.guard_course_status_change();

-- ------------------------------------------------------------
-- 3. 5.2 — professor sem Stripe conectado pode publicar curso pago
--    Nada a mudar no banco: o checkout já cai no caminho sem split quando
--    `stripe_account_id` é nulo (o dinheiro inteiro entra na plataforma) e o
--    webhook grava o `teacher_payouts` com status 'pending'. Ou seja, a
--    venda acontece e o valor do professor fica registrado como devido.
--    O que faltava era dizer isso a ele — está na tela de faturamento.
-- ------------------------------------------------------------
