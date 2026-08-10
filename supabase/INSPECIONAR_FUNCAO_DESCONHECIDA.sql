-- ============================================================
-- Inspeção de função fora do controle de versão — SOMENTE LEITURA
--
-- Troque o nome no WHERE para inspecionar qualquer função que a seção 8
-- do VERIFICAR_ESTADO.sql apontar como "fora das migrations".
--
-- NÃO execute a função para descobrir o que ela faz. Leia o código.
--
-- ------------------------------------------------------------
-- CASO RESOLVIDO — `rls_auto_enable`, investigada em 10/08/2026
--
-- Veredito: LEGÍTIMA, manter. Não revogar, não dropar.
--
-- O relatório a apontava como `SECURITY DEFINER` com `exec: anon
-- authenticated`, o que parecia escalação de privilégio. O fonte desarma:
--
--   • `RETURNS event_trigger` — esse tipo de retorno torna a função
--     NÃO-INVOCÁVEL diretamente. Só o gerenciador de event triggers do
--     Postgres a chama, ao processar um CREATE TABLE. O EXECUTE de `anon`
--     é o grant padrão a PUBLIC e é inalcançável na prática.
--   • `SET search_path TO 'pg_catalog'` — search_path fixo, a proteção
--     correta contra sequestro de nome em SECURITY DEFINER.
--   • O corpo habilita RLS em toda tabela nova de `public`, com allowlist
--     de schema e exceção tratada: é rede de segurança.
--
-- **Lição para a próxima:** cheque `prorettype` ANTES de classificar risco.
-- `event_trigger` e `trigger` nunca são chamáveis por cliente, então
-- SECURITY DEFINER + grant a anon nesses casos é ruído, não ameaça. A
-- seção 8 do VERIFICAR_ESTADO passou a fazer essa distinção sozinha.
-- ============================================================

select
  p.proname                                          as funcao,
  pg_get_userbyid(p.proowner)                        as dono,
  p.prosecdef                                        as security_definer,
  -- search_path fixo é o que impede sequestro de nome em SECURITY DEFINER.
  -- NULL aqui significa que ela herda o search_path de quem chama: risco.
  coalesce(array_to_string(p.proconfig, ', '), '⚠️ SEM search_path fixo') as config,
  has_function_privilege('anon',          p.oid, 'EXECUTE') as anon_pode_executar,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_pode_executar,
  pg_get_functiondef(p.oid)                          as codigo_fonte
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname = 'rls_auto_enable';

-- Se `anon_pode_executar` vier true e o código fizer qualquer coisa
-- privilegiada, revogue já:
--
--   revoke execute on function public.rls_auto_enable() from anon, authenticated;
--
-- E se o código não fizer nada que você reconheça como seu, o certo é
-- remover em vez de manter por precaução:
--
--   drop function if exists public.rls_auto_enable();
--
-- Antes de dropar, confirme que nenhuma policy/trigger depende dela —
-- a query abaixo lista dependências:
--
--   select pg_describe_object(classid, objid, objsubid)
--   from pg_depend
--   where refobjid = 'public.rls_auto_enable'::regproc;
