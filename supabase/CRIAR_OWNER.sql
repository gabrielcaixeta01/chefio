-- ============================================================
-- CRIAR_OWNER.sql — cria (ou promove) a conta dono/financeiro
--
-- Rode no SQL Editor do Supabase (projeto de produção).
-- Escolha UMA das duas opções abaixo.
--
-- Por que 'owner' e não 'admin':
--   get_my_role() traduz owner → 'admin' (migration 00015), então o owner
--   passa em todas as ~48 policies e em todo gate de /admin. A diferença
--   é que só ele altera comissão de professor (decisão 1.2).
--
-- ATENÇÃO: um owner NÃO acessa /professor. O middleware exige role
-- exatamente 'teacher' nessa rota. Se você usa sua conta pessoal para
-- dar aula, use a OPÇÃO A (conta dedicada) e não a B.
-- ============================================================


-- ============================================================
-- OPÇÃO A — criar uma conta nova, dedicada ao dono  (RECOMENDADO)
-- ============================================================
-- Edite as duas linhas de v_email / v_senha antes de rodar.
-- Troque a senha depois pelo fluxo normal de "esqueci minha senha".

do $$
declare
  v_email text := 'dono@gmail.com.br';   -- <<< EDITE
  v_senha text := 'senha123';     -- <<< EDITE
  v_nome  text := 'Dono Chefio';
  v_id    uuid;
begin
  select id into v_id from auth.users where email = v_email;

  if v_id is not null then
    raise notice 'Conta % já existe (%). Pulando criação, só promovendo.', v_email, v_id;
  else
    v_id := gen_random_uuid();

    -- raw_user_meta_data.role é lido por handle_new_user() (migration 00001),
    -- que cria a linha em public.profiles já com role='owner'.
    -- raw_app_meta_data.role é o claim que o middleware lê do JWT — colocado
    -- aqui direto para não depender da ordem dos triggers.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_id, 'authenticated', 'authenticated', v_email,
      extensions.crypt(v_senha, extensions.gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'owner'),
      jsonb_build_object('name', v_nome, 'role', 'owner'),
      '', '', '', ''   -- GoTrue não aceita NULL nessas colunas de token
    );

    -- Sem a identity o login por e-mail/senha não resolve o usuário.
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object(
        'sub', v_id::text, 'email', v_email,
        'email_verified', true, 'phone_verified', false
      ),
      'email', now(), now(), now()
    );

    raise notice 'Conta criada: % (%)', v_email, v_id;
  end if;

  -- Garante o role mesmo se o trigger handle_new_user tiver caído no default.
  -- Este update dispara profiles_sync_role_to_jwt (00005), que grava o claim.
  insert into public.profiles (id, name, role)
  values (v_id, v_nome, 'owner')
  on conflict (id) do update set role = 'owner';
end $$;


-- ============================================================
-- OPÇÃO B — promover uma conta que já existe
-- ============================================================
-- Use só se a conta NÃO for a que você usa como professor.
-- Descomente e ajuste o e-mail:
--
-- update public.profiles set role = 'owner'
-- where id = (select id from auth.users where email = 'seu@email.com');


-- ============================================================
-- VERIFICAÇÃO — rode depois, as duas colunas têm que dizer 'owner'
-- ============================================================
select
  u.email,
  p.role                        as role_na_tabela,
  u.raw_app_meta_data->>'role'  as role_no_jwt,
  (select count(*) from auth.identities i where i.user_id = u.id) as identities
from auth.users u
join public.profiles p on p.id = u.id
where p.role in ('owner', 'admin');
