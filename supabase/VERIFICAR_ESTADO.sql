-- ============================================================
-- Verificação de estado do banco — SOMENTE LEITURA
-- Cole no SQL Editor do Supabase e rode. Não escreve nada.
--
-- IMPORTANTE: é UMA consulta só, de propósito. O SQL Editor do Supabase
-- mostra apenas o resultado do ÚLTIMO statement quando você roda vários
-- separados por ';' — a versão anterior deste arquivo tinha 3 consultas
-- e só a terceira aparecia na tela.
--
-- Responde: quais migrations realmente rodaram neste projeto.
-- Criado em 10/08/2026, quando descobrimos que 00009 e 00010 nunca
-- foram aplicadas e ninguém tinha como saber pela aplicação — as RPCs
-- ausentes falhavam em silêncio (pedido de produto sumia, dashboards
-- do admin mostravam zero).
-- ============================================================

with esperado_funcao(nome, origem) as (values
  ('handle_new_user',                    '00001 / 00003'),
  ('update_updated_at',                  '00001'),
  ('get_my_role',                        '00002'),
  ('sync_role_with_teacher_status',      '00003 / 00011'),
  ('guard_course_status_change',         '00003'),
  ('sync_role_to_jwt',                   '00005'),
  ('guard_profile_role_change',          '00007'),
  ('guard_teacher_profile_admin_columns','00007'),
  ('create_product_order',               '00009'),
  ('get_admin_dashboard_stats',          '00010'),
  ('get_admin_financial_totals',         '00010'),
  ('get_admin_monthly_revenue',          '00010'),
  ('get_my_teacher_revenue_by_course',   '00010')
),
esperado_trigger(nome, origem) as (values
  ('on_auth_user_created',                 '00001 (em auth.users)'),
  ('courses_updated_at',                   '00001'),
  ('teacher_profiles_sync_role',           '00003 / 00011'),
  ('courses_guard_status_change',          '00003'),
  ('profiles_sync_role_to_jwt',            '00005'),
  ('profiles_guard_role_change',           '00007'),
  ('teacher_profiles_guard_admin_columns', '00007')
),
esperado_indice(nome, origem) as (values
  ('orders_stripe_payment_intent_id_key',   '00004'),
  ('teacher_payouts_stripe_transfer_id_key','00004'),
  ('idx_orders_student_id',                 '00006'),
  ('idx_order_items_order_id',              '00006'),
  ('idx_teacher_payouts_teacher_id',        '00006'),
  ('idx_documents_teacher_id',              '00006')
),
esperado_bucket(nome, publico) as (values
  ('thumbnails',  true),
  ('avatars',     true),
  ('documents',   false),
  ('attachments', false)
),
removida(nome, origem) as (values
  ('enrollments_student_insert', '00003 deve ter removido'),
  ('orders_student_insert',      '00007 deve ter removido')
)

-- 1. FUNÇÕES esperadas
select '1 FUNCAO' as tipo, e.nome as item,
       case when p.proname is null then '❌ FALTA' else '✅ ok' end as status,
       e.origem as detalhe
from esperado_funcao e
left join pg_proc p on p.proname = e.nome and p.pronamespace = 'public'::regnamespace

union all
-- 2. TRIGGERS (não aparecem na API REST)
select '2 TRIGGER', e.nome,
       case when t.tgname is null then '❌ FALTA' else '✅ ok' end,
       e.origem
from esperado_trigger e
left join pg_trigger t on t.tgname = e.nome and not t.tgisinternal

union all
-- 3. ÍNDICES (idempotência do Stripe + performance de RLS)
select '3 INDICE', e.nome,
       case when i.indexname is null then '❌ FALTA' else '✅ ok' end,
       e.origem
from esperado_indice e
left join pg_indexes i on i.indexname = e.nome and i.schemaname = 'public'

union all
-- 4. POLICIES QUE PRECISAM **NÃO** EXISTIR
-- Deixavam o aluno se matricular de graça e fabricar pedido 'paid'.
-- Aqui ✅ significa "ausente", como deve ser.
select '4 POLICY REMOVIDA', e.nome,
       case when pol.policyname is null
            then '✅ ausente (correto)'
            else '❌ AINDA EXISTE — furo aberto' end,
       e.origem
from removida e
left join pg_policies pol on pol.policyname = e.nome and pol.schemaname = 'public'

union all
-- 5. VIEW pública (00003)
select '5 VIEW', 'teacher_profiles_public',
       case when exists (
         select 1 from pg_views
         where schemaname = 'public' and viewname = 'teacher_profiles_public'
       ) then '✅ ok' else '❌ FALTA' end,
       '00003'

union all
-- 6. BUCKETS de storage (passo MANUAL da 00008)
select '6 BUCKET', e.nome,
       case
         when b.id is null then '❌ FALTA — criar no dashboard'
         when b.public <> e.publico then '⚠️ existe, visibilidade errada'
         else '✅ ok'
       end,
       case when e.publico then '00008 (deve ser público)'
            else '00008 (deve ser privado)' end
from esperado_bucket e
left join storage.buckets b on b.id = e.nome

union all
-- 7. RLS ligada em toda tabela do schema public (00002)
select '7 RLS', t.tablename, '❌ SEM RLS — CORRIGIR', 'toda tabela exposta precisa de RLS'
from pg_tables t
where t.schemaname = 'public' and t.rowsecurity = false

union all
-- 8. Funções que NÃO vêm das migrations
--
-- `SECURITY DEFINER` chamável por `anon` é o vetor clássico de escalação
-- no Supabase — mas o tipo de retorno decide se é chamável de verdade.
-- Função `event_trigger` ou `trigger` só é executada pelo Postgres, nunca
-- por um cliente: o EXECUTE herdado de PUBLIC ali é inalcançável, e marcá-la
-- como risco gera alarme falso (foi o que aconteceu com `rls_auto_enable`
-- em 10/08 antes de alguém ler o fonte).
--
-- `rls_auto_enable` está na allowlist: investigada em 10/08/2026, habilita
-- RLS em tabela nova de `public`, tem search_path fixo. Ver a nota na
-- migration 00013. Qualquer OUTRA coisa listada aqui entrou por fora e
-- precisa do INSPECIONAR_FUNCAO_DESCONHECIDA.sql antes de ser assumida ok.
select '8 FORA DAS MIGRATIONS', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
       case
         when p.proname = 'rls_auto_enable' and p.prorettype = 'pg_catalog.event_trigger'::regtype
           then '✅ conhecida e aprovada (ver 00013)'
         when p.prorettype in ('pg_catalog.event_trigger'::regtype, 'pg_catalog.trigger'::regtype)
           then 'ℹ️ so o Postgres chama (' || pg_catalog.format_type(p.prorettype, null) || ')'
         when p.prosecdef and has_function_privilege('anon', p.oid, 'EXECUTE')
           then '🚨 SECURITY DEFINER chamavel por anon'
         when p.prosecdef then '⚠️ SECURITY DEFINER'
         else 'invoker'
       end,
       'exec: '
         || case when has_function_privilege('anon',          p.oid, 'EXECUTE') then 'anon ' else '' end
         || case when has_function_privilege('authenticated', p.oid, 'EXECUTE') then 'authenticated ' else '' end
         || '| search_path: ' || coalesce(array_to_string(p.proconfig, ' '), '⚠️ nao fixo')
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname not in (select nome from esperado_funcao)

union all
-- 9. Quem pode executar as RPCs — estado esperado APÓS a 00012
--
-- `create_product_order` é chamada só pelo webhook, com service role: nem
-- anon nem authenticated devem alcançar (ela é security definer, insere
-- pedido 'paid' e recebe o student_id como parâmetro — com anon liberado,
-- qualquer um fabrica pedido sem pagar).
--
-- As de leitura são chamadas por server component com a sessão do usuário,
-- então `authenticated` precisa; `anon` não, porque sem sessão não há caso
-- de uso legítimo.
select '9 GRANT DA RPC', p.proname,
       case
         when p.proname = 'create_product_order' then
           case when has_function_privilege('anon', p.oid, 'EXECUTE')
                  or has_function_privilege('authenticated', p.oid, 'EXECUTE')
                then '❌ EXPOSTA — pedido pago sem pagar'
                else '✅ so service_role (correto)' end
         when not has_function_privilege('authenticated', p.oid, 'EXECUTE') then
           '❌ authenticated SEM permissao — tela fica zerada'
         when has_function_privilege('anon', p.oid, 'EXECUTE') then
           '❌ anon pode executar — revogar'
         else '✅ ok'
       end,
       'anon: '          || case when has_function_privilege('anon',          p.oid, 'EXECUTE') then 'sim' else 'nao' end
       || ' | authenticated: ' || case when has_function_privilege('authenticated', p.oid, 'EXECUTE') then 'sim' else 'nao' end
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in (
    'create_product_order','get_admin_dashboard_stats',
    'get_admin_financial_totals','get_admin_monthly_revenue',
    'get_my_teacher_revenue_by_course','get_my_role'
  )

order by 1, 2;
