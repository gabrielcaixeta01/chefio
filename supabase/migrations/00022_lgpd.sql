-- ============================================================
-- Migration 00022: Exclusão de conta e anonimização (19/08/2026)
-- Execute APÓS 00021_loja_fisica.sql
--
-- Decisões da seção 9 do regras-negocio.md:
--   9.1 — termos de uso e política de privacidade: sem decisão ainda, e
--         nada aqui depende disso.
--   9.2 — controlador e DPO em branco: idem.
--   9.3 — botão de excluir conta, apaga na hora, com confirmação.
--   9.4 — o cadastro é anonimizado e o histórico de compra fica: nota
--         fiscal tem obrigação de guarda que a LGPD reconhece.
--   9.5 — banner de cookies: é tudo no front, nada de schema.
--
-- O par 9.3 + 9.4 só fecha se as duas coisas acontecerem juntas: apagar o
-- usuário do Auth (onde moram e-mail e credencial) e MANTER a linha de
-- `profiles` como um toco anônimo, porque matrícula, pedido e repasse
-- apontam pra ela. Hoje `profiles.id` referencia `auth.users(id)` com
-- ON DELETE CASCADE — apagar o usuário levaria o toco junto e, em cascata,
-- todo o histórico fiscal. É isso que a seção 1 abaixo desfaz.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Soltar profiles de auth.users (9.3 + 9.4)
-- ------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_id_fkey;

alter table public.profiles
  add column if not exists deleted_at timestamptz;

-- Índice parcial: as telas de admin e as listas públicas passam a filtrar
-- por conta viva, e contas removidas são a minoria.
create index if not exists idx_profiles_removidas
  on public.profiles (deleted_at) where deleted_at is not null;

-- ------------------------------------------------------------
-- 2. Anonimizar (9.3, 9.4)
-- ------------------------------------------------------------
-- Chamada pela rota /api/conta com service role, ANTES de apagar o usuário
-- no Auth. O que é conteúdo pessoal some de vez; o que é registro de
-- transação fica sem dono identificável.
create or replace function public.anonymize_account(p_user_id uuid)
returns void as $$
declare
  v_pendencias integer;
begin
  -- Processo em aberto trava a exclusão: reembolso e devolução ainda
  -- precisam de alguém pra receber o dinheiro de volta e combinar a coleta.
  select count(*) into v_pendencias
  from public.enrollments
  where student_id = p_user_id and refund_status = 'requested';

  if v_pendencias > 0 then
    raise exception 'Você tem um pedido de reembolso em análise. Espere a resposta antes de excluir a conta.';
  end if;

  select count(*) into v_pendencias
  from public.orders
  where student_id = p_user_id and return_status = 'requested';

  if v_pendencias > 0 then
    raise exception 'Você tem uma devolução em análise. Espere a resposta antes de excluir a conta.';
  end if;

  -- Conteúdo pessoal: sai inteiro, não tem por que sobreviver anonimizado.
  delete from public.notebooks      where student_id = p_user_id;
  delete from public.lesson_progress where student_id = p_user_id;
  delete from public.active_sessions where user_id = p_user_id;
  delete from public.documents       where teacher_id = p_user_id;

  -- Candidatura de professor é documento, telefone e portfólio — tudo
  -- identificável (4.2). A linha fica porque `courses` depende dela, mas
  -- vazia e suspensa: sem status ativo não entra venda nova.
  update public.teacher_profiles
     set bio = null,
         document = null,
         phone = null,
         portfolio_url = null,
         experience = null,
         rejection_reason = null,
         stripe_account_id = null,
         status = 'suspended'
   where user_id = p_user_id;

  -- Curso sai do catálogo, não é apagado: quem comprou mantém o acesso
  -- (3.1) e a licença é permanente mesmo se o professor sair (6.1).
  update public.courses
     set archived_at = now()
   where teacher_id = p_user_id
     and archived_at is null;

  -- O toco. `name` não pode ficar nulo (not null desde a 00001), e é ele
  -- que aparece onde o histórico continua sendo mostrado.
  update public.profiles
     set name = 'Conta removida',
         avatar_url = null,
         marketing_opt_in = false,
         marketing_opt_in_changed_at = now(),
         deleted_at = now()
   where id = p_user_id;
end;
$$ language plpgsql security definer set search_path = public;

-- Só a rota executa: quem apaga o usuário no Auth é ela, e as duas coisas
-- têm que acontecer na mesma requisição.
revoke execute on function public.anonymize_account(uuid) from anon, authenticated;
grant execute on function public.anonymize_account(uuid) to service_role;

-- ------------------------------------------------------------
-- 3. Sobre a leitura pública do toco
-- ------------------------------------------------------------
-- `profiles_teacher_public_read` continua como está, de propósito. Filtrar
-- `deleted_at is null` ali pareceria mais seguro e seria pior: a linha já
-- foi anonimizada, então não há o que proteger, e todo embed
-- `teacher:profiles(name)` do projeto passaria a devolver nulo pro aluno que
-- comprou o curso de alguém que saiu — que é exatamente quem ainda precisa
-- ver de quem é a aula. O nome que aparece é "Conta removida".
--
-- A vitrine não mostra esses cursos de qualquer jeito: `anonymize_account`
-- arquiva todos, e `courses_public_approved_read` exige `archived_at is null`.
