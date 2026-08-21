-- ============================================================
-- SEED_HML_1_CONTAS.sql — contas de teste do ambiente de homologação
--
-- ORDEM DE EXECUÇÃO:
--   1. CRIAR_OWNER.sql        (já rodou)
--   2. SEED_HML_1_CONTAS.sql  ← este arquivo
--   3. SEED_DADOS_DEMO.sql    (cursos, aulas e produtos — exige professor ativo,
--                              que é criado aqui)
--   4. SEED_HML_2_MOVIMENTO.sql
--
-- NÃO RODE EM PRODUÇÃO. Cria usuários com senha fixa 'senha123' e e-mails
-- @chefio.test, que é um TLD reservado (RFC 2606) — nenhum e-mail sai daqui,
-- e nenhum endereço real é ocupado por engano.
--
-- Idempotente: e-mail já existente é pulado.
-- ============================================================


-- ------------------------------------------------------------
-- 0. Arrumar o e-mail da conta owner
-- A conta nasceu como 'dono@gmail.com.br' — domínio que não existe (o .br
-- colado no gmail.com). Não quebrava o login, porque email_confirmed_at já
-- vem preenchido, mas recuperação de senha cairia no vazio.
--
-- Se você já corrigiu à mão para 'dono@gmail.com', os dois updates abaixo
-- não encontram nada e o script segue — são no-op, pode rodar tranquilo.
-- ------------------------------------------------------------
update auth.users
set email = 'dono@gmail.com',
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
                         || jsonb_build_object('email', 'dono@gmail.com')
where email = 'dono@gmail.com.br';

update auth.identities
set identity_data = identity_data || jsonb_build_object('email', 'dono@gmail.com')
where identity_data->>'email' = 'dono@gmail.com.br';


-- ------------------------------------------------------------
-- 1. Função auxiliar de criação de usuário
-- Mesma receita do CRIAR_OWNER.sql, empacotada pra não repetir 9 vezes.
-- É temporária: dropada no fim do arquivo.
-- ------------------------------------------------------------
create or replace function public.__seed_usuario(
  p_email text,
  p_nome  text,
  p_role  text default 'student',
  p_senha text default 'senha123'
) returns uuid as $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where email = p_email;
  if v_id is not null then
    return v_id;
  end if;

  v_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt(p_senha, extensions.gen_salt('bf')),
    now(), now() - interval '40 days', now(),
    jsonb_build_object('provider','email','providers',array['email'],'role',p_role),
    -- ATENÇÃO ao 'student' fixo aqui. A migration 00003 reescreveu
    -- handle_new_user() e, quando raw_user_meta_data.role = 'teacher', ela
    -- cria sozinha uma linha em teacher_profiles com status 'pending' e id
    -- aleatório. Isso colidiria com o insert de UUID fixo lá embaixo
    -- (teacher_profiles.user_id é unique). Declarando 'student' no metadata
    -- o gatilho não dispara, e o vínculo de professor nasce só do insert
    -- explícito — que é onde os status active/pending/rejected são decididos.
    jsonb_build_object('name', p_nome, 'role', 'student'),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', p_email,
                       'email_verified', true, 'phone_verified', false),
    'email', now(), now() - interval '40 days', now()
  );

  -- handle_new_user() já criou o profile, mas SEMPRE com role 'student':
  -- a versão da 00003 ignora o role do metadata e crava o literal. Então
  -- este upsert não é redundância, é ele quem de fato define o papel.
  insert into public.profiles (id, name, role)
  values (v_id, p_nome, p_role)
  on conflict (id) do update set name = excluded.name, role = excluded.role;

  return v_id;
end;
$$ language plpgsql security definer set search_path = public;


-- ------------------------------------------------------------
-- 2. As contas
-- ------------------------------------------------------------
do $$
declare
  v_marina   uuid;  -- professora ativa (dona do catálogo)
  v_bruno    uuid;  -- segundo professor, comissão fora do padrão
  v_rafael   uuid;  -- candidatura pendente
  v_leticia  uuid;  -- candidatura pendente
  v_paulo    uuid;  -- candidatura rejeitada
  v_ana      uuid;
  v_carlos   uuid;
  v_dani     uuid;
  v_edu      uuid;
begin
  -- Professores ---------------------------------------------------
  v_marina  := public.__seed_usuario('marina@chefio.test',  'Marina Alencar',  'teacher');
  v_bruno   := public.__seed_usuario('bruno@chefio.test',   'Bruno Tavares',   'teacher');

  -- Candidatos: entram como student. O role só vira 'teacher' quando o admin
  -- aprovar e o teacher_profiles_sync_role (00011) promover.
  v_rafael  := public.__seed_usuario('rafael@chefio.test',  'Rafael Nogueira');
  v_leticia := public.__seed_usuario('leticia@chefio.test', 'Letícia Sampaio');
  v_paulo   := public.__seed_usuario('paulo@chefio.test',   'Paulo Ribeiro');

  -- Alunos --------------------------------------------------------
  v_ana     := public.__seed_usuario('ana@chefio.test',     'Ana Beatriz Lima');
  v_carlos  := public.__seed_usuario('carlos@chefio.test',  'Carlos Menezes');
  v_dani    := public.__seed_usuario('dani@chefio.test',    'Daniela Correia');
  v_edu     := public.__seed_usuario('edu@chefio.test',     'Eduardo Pinto');

  -- ------------------------------------------------------------
  -- teacher_profiles
  -- guard_teacher_profile_insert (00018) só força status='pending' quando
  -- auth.uid() não é null. No SQL Editor é null, então os status abaixo
  -- passam intactos.
  -- ------------------------------------------------------------
  insert into public.teacher_profiles
    (id, user_id, bio, commission_rate, status, document, phone,
     portfolio_url, experience, submitted_at, exclusivity_accepted_at,
     rejection_reason, reviewed_at, created_at)
  values
    ('d4000000-0000-4000-8000-000000000001', v_marina,
     'Cozinheira há 14 anos, passou por brigada de restaurante italiano e hoje dá aula de massa e panificação. Ensina técnica, não receita decorada.',
     15.00, 'active', '123.456.789-01', '(11) 98877-1200',
     'https://instagram.com/marina.cozinha',
     'Chef de partida no Osteria Trentina (2014-2019). Padaria própria desde 2020.',
     now() - interval '38 days', now() - interval '38 days',
     null, now() - interval '36 days', now() - interval '38 days'),

    -- Comissão em 20% de propósito: é o caso pra você abrir em /admin/financeiro,
    -- baixar pra 15% e ver a linha aparecer em commission_changes (decisão 1.2).
    ('d4000000-0000-4000-8000-000000000002', v_bruno,
     'Açougueiro de formação, virou professor de churrasco. Fala de corte, brasa e ponto — e de por que quase todo mundo erra a temperatura.',
     20.00, 'active', '987.654.321-00', '(41) 99120-3344',
     'https://brunobrasa.com.br',
     'Doze anos de açougue, cinco de curso presencial de churrasco no Paraná.',
     now() - interval '25 days', now() - interval '25 days',
     null, now() - interval '24 days', now() - interval '25 days'),

    -- FILA DE APROVAÇÃO: estes dois aparecem em /admin/professores
    ('d4000000-0000-4000-8000-000000000003', v_rafael,
     'Confeiteiro especializado em chocolate. Quero trazer temperagem e bombons pra plataforma.',
     15.00, 'pending', '111.222.333-44', '(21) 98100-7788',
     'https://rafaelchocolates.com',
     'Cinco anos em confeitaria de hotel, curso técnico pelo Senac Rio.',
     now() - interval '3 days', now() - interval '3 days',
     null, null, now() - interval '3 days'),

    ('d4000000-0000-4000-8000-000000000004', v_leticia,
     'Cozinha do Nordeste — quero um curso só de peixe e frutos do mar de tabuleiro.',
     15.00, 'pending', '55.444.333/0001-22', '(81) 99433-2211',
     null,
     'Restaurante próprio em Olinda há oito anos. Nunca gravei aula, mas sei o que quero ensinar.',
     now() - interval '1 day', now() - interval '1 day',
     null, null, now() - interval '1 day'),

    -- Rejeitado: serve pra conferir que a tela separa histórico de fila
    ('d4000000-0000-4000-8000-000000000005', v_paulo,
     'Cozinha rápida pra quem mora sozinho.',
     15.00, 'rejected', '222.333.444-55', '(31) 98222-1100',
     null,
     'Sem experiência formal.',
     now() - interval '20 days', now() - interval '20 days',
     'Portfólio insuficiente e sem amostra de aula gravada. Pode reenviar com dois vídeos de exemplo.',
     now() - interval '18 days', now() - interval '20 days')
  -- user_id (e nao o id) e o arbitro: numa reexecucao e ele que colide.
  on conflict (user_id) do nothing;

  raise notice 'Contas criadas. Professor ativo principal: % (marina@chefio.test)', v_marina;
end $$;


drop function if exists public.__seed_usuario(text, text, text, text);


-- ============================================================
-- CONFERÊNCIA
-- ============================================================
select u.email,
       p.name,
       p.role,
       u.raw_app_meta_data->>'role' as role_no_jwt,
       tp.status                    as status_professor
from auth.users u
join public.profiles p on p.id = u.id
left join public.teacher_profiles tp on tp.user_id = p.id
order by p.role, u.email;

-- Senha de todas as contas de teste: senha123
-- Próximo passo: rodar SEED_DADOS_DEMO.sql, depois SEED_HML_2_MOVIMENTO.sql
