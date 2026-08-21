-- ============================================================
-- SEED_HML_2_MOVIMENTO.sql — matrículas, pedidos e filas de aprovação
--
-- ORDEM: rode DEPOIS de SEED_HML_1_CONTAS.sql e de SEED_DADOS_DEMO.sql.
--
-- NÃO RODE EM PRODUÇÃO.
--
-- O SEED_DADOS_DEMO.sql evita de propósito criar enrollments, orders e
-- payouts, com um argumento correto: em produção você não conseguiria
-- distinguir "o checkout funcionou" de "o seed inventou a linha". Em HML
-- esse argumento não vale — você quer ver as telas cheias. Então aqui a
-- gente forja o ciclo inteiro.
--
-- CONSEQUÊNCIA, EXPLÍCITA: nenhuma linha abaixo passou por Stripe. Os
-- stripe_payment_intent_id são falsos, com prefixo `pi_hmlseed_` justamente
-- pra você conseguir apagar tudo depois com um `like 'pi_hmlseed_%'`. Os
-- fluxos de pagamento continuam sem nunca ter rodado de verdade contra
-- este banco.
--
-- Idempotente: UUID fixo + on conflict do nothing.
-- ============================================================

do $$
declare
  -- Cursos (UUIDs fixos do SEED_DADOS_DEMO.sql)
  c_gratis  uuid := 'a1000000-0000-4000-8000-000000000001';
  c_pao     uuid := 'a1000000-0000-4000-8000-000000000002';
  c_confeit uuid := 'a1000000-0000-4000-8000-000000000003';
  c_massas  uuid := 'a1000000-0000-4000-8000-000000000004';
  c_revisao uuid := 'a1000000-0000-4000-8000-000000000005';

  -- Produtos
  p_forma      uuid := 'b2000000-0000-4000-8000-000000000001';
  p_raspador   uuid := 'b2000000-0000-4000-8000-000000000002';
  p_termometro uuid := 'b2000000-0000-4000-8000-000000000003';
  p_faca       uuid := 'b2000000-0000-4000-8000-000000000004';
  p_bancada    uuid := 'b2000000-0000-4000-8000-000000000005';
  p_esgotado   uuid := 'b2000000-0000-4000-8000-000000000006';

  -- Pessoas
  v_owner   uuid;
  v_marina  uuid;
  v_bruno   uuid;
  v_ana     uuid;
  v_carlos  uuid;
  v_dani    uuid;
  v_edu     uuid;

  -- Matrículas (preciso do id pra ligar payout e clawback)
  e_ana_pao      uuid := 'e5000000-0000-4000-8000-000000000002';
  e_carlos_conf  uuid := 'e5000000-0000-4000-8000-000000000004';
  e_dani_massas  uuid := 'e5000000-0000-4000-8000-000000000005';
  e_edu_pao      uuid := 'e5000000-0000-4000-8000-000000000006';

  -- Pedidos
  o_pendente  uuid := 'f6000000-0000-4000-8000-000000000001';
  o_pago      uuid := 'f6000000-0000-4000-8000-000000000002';
  o_enviado   uuid := 'f6000000-0000-4000-8000-000000000003';
  o_entregue  uuid := 'f6000000-0000-4000-8000-000000000004';
  o_devolucao uuid := 'f6000000-0000-4000-8000-000000000005';

  v_faltando uuid[];
begin
  -- ------------------------------------------------------------
  -- Pré-requisitos
  -- ------------------------------------------------------------
  if not exists (select 1 from public.courses where id = c_gratis) then
    raise exception 'Cursos demo não encontrados. Rode SEED_DADOS_DEMO.sql antes deste arquivo.';
  end if;

  select id into v_marina from auth.users where email = 'marina@chefio.test';
  select id into v_bruno  from auth.users where email = 'bruno@chefio.test';
  select id into v_ana    from auth.users where email = 'ana@chefio.test';
  select id into v_carlos from auth.users where email = 'carlos@chefio.test';
  select id into v_dani   from auth.users where email = 'dani@chefio.test';
  select id into v_edu    from auth.users where email = 'edu@chefio.test';
  select id into v_owner  from public.profiles where role = 'owner' limit 1;

  if v_ana is null then
    raise exception 'Contas de teste não encontradas. Rode SEED_HML_1_CONTAS.sql antes deste arquivo.';
  end if;

  -- ------------------------------------------------------------
  -- Aulas ausentes
  -- Nem todo banco de HML tem o catálogo completo: aula apagada à mão,
  -- curso recriado, seed demo rodado pela metade. Em vez de estourar FK no
  -- meio do script, a gente detecta antes, avisa, e mais abaixo pula só as
  -- linhas que dependem da aula que falta — o resto do seed entra inteiro.
  -- ------------------------------------------------------------
  select array_agg(t.id order by t.id) into v_faltando
  from (values
    ('c3000000-0000-4000-8000-000000000001'::uuid), ('c3000000-0000-4000-8000-000000000002'::uuid),
    ('c3000000-0000-4000-8000-000000000003'::uuid), ('c3000000-0000-4000-8000-000000000004'::uuid),
    ('c3000000-0000-4000-8000-000000000011'::uuid), ('c3000000-0000-4000-8000-000000000012'::uuid),
    ('c3000000-0000-4000-8000-000000000013'::uuid), ('c3000000-0000-4000-8000-000000000014'::uuid),
    ('c3000000-0000-4000-8000-000000000015'::uuid), ('c3000000-0000-4000-8000-000000000021'::uuid),
    ('c3000000-0000-4000-8000-000000000022'::uuid), ('c3000000-0000-4000-8000-000000000023'::uuid),
    ('c3000000-0000-4000-8000-000000000024'::uuid), ('c3000000-0000-4000-8000-000000000031'::uuid)
  ) as t(id)
  where not exists (select 1 from public.lessons l where l.id = t.id);

  if v_faltando is not null then
    raise notice 'ATENÇÃO: % aula(s) do seed demo não existem neste banco: %',
      array_length(v_faltando, 1), v_faltando;
    raise notice 'O seed continua, pulando o que depende delas. Rode SEED_DADOS_DEMO.sql para recriá-las.';
  end if;

  -- ------------------------------------------------------------
  -- 1. MATRÍCULAS
  -- Cobrem os quatro estados de refund_status que a tela distingue:
  -- none, requested (fila do admin), refunded (acesso cortado) e rejected.
  -- As datas importam: a regra 2.1 dá 7 dias corridos, então uma matrícula
  -- de 40 dias atrás não deve mostrar o botão de pedir reembolso.
  -- ------------------------------------------------------------
  insert into public.enrollments
    (id, student_id, course_id, stripe_payment_intent_id, amount_paid,
     discount_amount, refund_status, refund_requested_at, refunded_at,
     refund_amount, refund_reason, refund_review_note, created_at)
  values
    -- Ana: curso grátis (único fluxo que roda de ponta a ponta sem Stripe)
    ('e5000000-0000-4000-8000-000000000001', v_ana, c_gratis,
     null, 0, 0, 'none', null, null, null, null, null, now() - interval '30 days'),

    -- Ana: pão com cupom BEMVINDO10 aplicado (129.90 - 12.99)
    (e_ana_pao, v_ana, c_pao,
     'pi_hmlseed_ana_pao', 116.91, 12.99, 'none', null, null, null, null, null,
     now() - interval '22 days'),

    ('e5000000-0000-4000-8000-000000000003', v_carlos, c_gratis,
     null, 0, 0, 'none', null, null, null, null, null, now() - interval '15 days'),

    (e_carlos_conf, v_carlos, c_confeit,
     'pi_hmlseed_carlos_confeit', 189.90, 0, 'none', null, null, null, null, null,
     now() - interval '12 days'),

    -- FILA DE REEMBOLSO: aparece em /admin/reembolsos esperando decisão
    (e_dani_massas, v_dani, c_massas,
     'pi_hmlseed_dani_massas', 149.90, 0, 'requested',
     now() - interval '2 days', null, null,
     'Comprei achando que era sobre massa de pizza. O conteúdo é ótimo, mas não é o que eu procurava.',
     null, now() - interval '5 days'),

    -- Já reembolsado: refunded_at preenchido corta o acesso (decisão 2.3)
    (e_edu_pao, v_edu, c_pao,
     'pi_hmlseed_edu_pao', 129.90, 0, 'refunded',
     now() - interval '11 days', now() - interval '10 days', 129.90,
     'Não consegui acompanhar, o forno de casa não dá conta.',
     'Dentro dos 7 dias. Reembolso integral aprovado.',
     now() - interval '14 days'),

    ('e5000000-0000-4000-8000-000000000007', v_dani, c_gratis,
     null, 0, 0, 'none', null, null, null, null, null, now() - interval '8 days'),

    -- Reembolso REJEITADO: pediu no 11º dia, fora dos 7 corridos da regra 2.1.
    -- O acesso continua de pé porque refunded_at ficou null (decisão 2.3).
    ('e5000000-0000-4000-8000-000000000008', v_edu, c_confeit,
     'pi_hmlseed_edu_confeit', 189.90, 0, 'rejected',
     now() - interval '19 days', null, null,
     'Mudei de ideia, quero o dinheiro de volta.',
     'Pedido feito 11 dias após a compra. O prazo de arrependimento é de 7 dias corridos (art. 49 do CDC). Acesso mantido.',
     now() - interval '30 days')
  on conflict (id) do nothing;

  -- ------------------------------------------------------------
  -- 2. PROGRESSO DAS AULAS
  -- Sem isso a área do aluno mostra 0% em tudo e as barras de progresso
  -- ficam invisíveis. Ana está com o curso grátis quase no fim.
  -- ------------------------------------------------------------
  -- O join com lessons é o que evita o estouro de FK quando o catálogo do
  -- banco está incompleto: aula que não existe simplesmente não gera linha.
  insert into public.lesson_progress
    (student_id, lesson_id, completed_at, last_watched_seconds)
  select v.student_id, v.lesson_id, v.completed_at, v.segundos
  from (values
    (v_ana,    'c3000000-0000-4000-8000-000000000001'::uuid, (now() - interval '29 days')::timestamptz, 720),
    (v_ana,    'c3000000-0000-4000-8000-000000000002'::uuid, (now() - interval '28 days')::timestamptz, 640),
    (v_ana,    'c3000000-0000-4000-8000-000000000003'::uuid, (now() - interval '26 days')::timestamptz, 900),
    (v_ana,    'c3000000-0000-4000-8000-000000000004'::uuid, null::timestamptz,                         410),
    (v_ana,    'c3000000-0000-4000-8000-000000000011'::uuid, (now() - interval '20 days')::timestamptz, 830),
    (v_ana,    'c3000000-0000-4000-8000-000000000012'::uuid, null::timestamptz,                         260),
    (v_carlos, 'c3000000-0000-4000-8000-000000000021'::uuid, (now() - interval '10 days')::timestamptz, 1450),
    (v_carlos, 'c3000000-0000-4000-8000-000000000022'::uuid, null::timestamptz,                         300),
    (v_carlos, 'c3000000-0000-4000-8000-000000000001'::uuid, (now() - interval '14 days')::timestamptz, 720),
    (v_dani,   'c3000000-0000-4000-8000-000000000031'::uuid, null::timestamptz,                         120)
  ) as v(student_id, lesson_id, completed_at, segundos)
  join public.lessons l on l.id = v.lesson_id
  on conflict (student_id, lesson_id) do nothing;

  -- ------------------------------------------------------------
  -- 3. CADERNOS DO ALUNO
  -- ------------------------------------------------------------
  insert into public.notebooks (id, student_id, course_id, content, updated_at)
  values
    ('a7000000-0000-4000-8000-000000000001', v_ana, c_pao,
     '{"blocos":[{"tipo":"nota","texto":"Levain dobra de volume em ~5h a 26°C. Na minha cozinha (22°C) levou 8h."},{"tipo":"nota","texto":"Hidratação 75% ainda gruda muito na mão. Molhar a mão antes da dobra resolve."},{"tipo":"nota","texto":"Panela de ferro pré-aquecida 45min, não 20."}]}'::jsonb,
     now() - interval '19 days'),
    ('a7000000-0000-4000-8000-000000000002', v_carlos, c_confeit,
     '{"blocos":[{"tipo":"nota","texto":"Manteiga entre 14 e 16°C pra dobra. Acima disso vaza."},{"tipo":"nota","texto":"Creme: tirar do fogo 30s depois de engrossar, senão talha."}]}'::jsonb,
     now() - interval '9 days')
  on conflict (student_id, course_id) do nothing;

  -- ------------------------------------------------------------
  -- 4. PEDIDOS DA LOJA
  -- Um de cada status, mais um com devolução aberta. O guard de status
  -- (orders_guard_status_change, 00021) só roda em UPDATE, então os
  -- inserts abaixo entram já no estado final sem brigar com o trigger.
  -- ------------------------------------------------------------
  insert into public.orders
    (id, student_id, status, total, stripe_payment_intent_id,
     shipping_name, shipping_line1, shipping_line2, shipping_city,
     shipping_state, shipping_postal_code, shipping_country,
     quoted_postal_code, shipping_cost, shipping_days,
     tracking_code, shipped_at, delivered_at,
     return_status, return_requested_at, return_reason, created_at)
  values
    -- Aguardando pagamento
    (o_pendente, v_ana, 'pending', 53.40, null,
     'Ana Beatriz Lima', 'Rua Harmonia, 412', 'apto 34', 'São Paulo',
     'SP', '05435-000', 'BR', '05435-000', 18.90, 4,
     null, null, null, 'none', null, null, now() - interval '1 day'),

    -- FILA DE EXPEDIÇÃO: pago, esperando você despachar em /admin/pedidos
    (o_pago, v_carlos, 'paid', 449.80, 'pi_hmlseed_pedido_carlos',
     'Carlos Menezes', 'Av. Nossa Senhora de Copacabana, 1180', null, 'Rio de Janeiro',
     'RJ', '22070-011', 'BR', '22070-011', 0, 6,
     null, null, null, 'none', null, null, now() - interval '3 days'),

    -- Em trânsito
    (o_enviado, v_dani, 'shipped', 112.40, 'pi_hmlseed_pedido_dani',
     'Daniela Correia', 'Rua da Bahia, 1200', 'sala 7', 'Belo Horizonte',
     'MG', '30160-011', 'BR', '30160-011', 22.50, 7,
     'BR482910375BR', now() - interval '4 days', null,
     'none', null, null, now() - interval '9 days'),

    -- Entregue, tudo certo
    (o_entregue, v_edu, 'delivered', 138.90, 'pi_hmlseed_pedido_edu',
     'Eduardo Pinto', 'Rua Gonçalves Chaves, 3100', null, 'Pelotas',
     'RS', '96015-560', 'BR', '96015-560', 19.90, 9,
     'BR119384756BR', now() - interval '18 days', now() - interval '12 days',
     'none', null, null, now() - interval '21 days'),

    -- FILA DE DEVOLUÇÃO: entregue e o aluno pediu troca
    (o_devolucao, v_ana, 'delivered', 110.90, 'pi_hmlseed_pedido_ana2',
     'Ana Beatriz Lima', 'Rua Harmonia, 412', 'apto 34', 'São Paulo',
     'SP', '05435-000', 'BR', '05435-000', 21.00, 4,
     'BR774521908BR', now() - interval '16 days', now() - interval '11 days',
     'requested', now() - interval '2 days',
     'O cesto veio com o rattan solto numa das bordas, começou a soltar farpa na massa.',
     now() - interval '19 days')
  on conflict (id) do nothing;

  insert into public.order_items
    (id, order_id, product_id, quantity, unit_price, teacher_id, teacher_commission_rate)
  values
    ('b8000000-0000-4000-8000-000000000001', o_pendente,  p_raspador,   1, 34.50,  null, 0),
    ('b8000000-0000-4000-8000-000000000002', o_pago,      p_faca,       1, 289.90, null, 0),
    ('b8000000-0000-4000-8000-000000000003', o_pago,      p_bancada,    1, 159.90, null, 0),
    ('b8000000-0000-4000-8000-000000000004', o_enviado,   p_forma,      1, 89.90,  null, 0),
    ('b8000000-0000-4000-8000-000000000005', o_entregue,  p_termometro, 1, 119.00, null, 0),
    ('b8000000-0000-4000-8000-000000000006', o_devolucao, p_forma,      1, 89.90,  null, 0)
  on conflict (id) do nothing;

  -- Estoque tem que refletir o que saiu, senão /admin/produtos mente.
  -- Só desconta na primeira execução: o guard olha se o pedido acabou de nascer.
  if not exists (select 1 from public.products where id = p_faca and stock < 9) then
    update public.products set stock = stock - 1 where id in (p_raspador, p_faca, p_bancada, p_termometro);
    update public.products set stock = stock - 2 where id = p_forma;
  end if;

  -- ------------------------------------------------------------
  -- 5. CUPONS
  -- Quatro estados: ativo ilimitado, ativo com limite quase estourado,
  -- expirado e desativado à mão.
  -- ------------------------------------------------------------
  insert into public.coupons
    (id, code, discount_percent, course_id, max_redemptions, redemptions,
     expires_at, active, created_by, created_at)
  values
    ('c9000000-0000-4000-8000-000000000001', 'BEMVINDO10', 10, null, null, 37,
     null, true, v_owner, now() - interval '35 days'),

    ('c9000000-0000-4000-8000-000000000002', 'CONFEITARIA25', 25, c_confeit, 50, 46,
     now() + interval '20 days', true, v_owner, now() - interval '18 days'),

    ('c9000000-0000-4000-8000-000000000003', 'PAOFORTE15', 15, c_pao, 100, 8,
     now() + interval '60 days', true, v_owner, now() - interval '6 days'),

    -- Expirado: a data já passou, mas active continua true — é o caso que
    -- pega implementação que só olha a flag e esquece o expires_at.
    ('c9000000-0000-4000-8000-000000000004', 'NATAL2025', 30, null, null, 112,
     now() - interval '90 days', true, v_owner, now() - interval '200 days'),

    -- Desativado à mão
    ('c9000000-0000-4000-8000-000000000005', 'INFLUENCER50', 50, null, 20, 20,
     null, false, v_owner, now() - interval '45 days')
  on conflict (id) do nothing;

  -- ------------------------------------------------------------
  -- 6. PEDIDOS DE ALTERAÇÃO DE AULA  →  /admin/alteracoes
  -- Só existem porque os cursos já têm aluno: o lessons_guard_change (00017)
  -- bloqueia a edição direta e obriga o professor a pedir aval.
  -- ------------------------------------------------------------
  insert into public.lesson_change_requests
    (id, lesson_id, lesson_title, course_id, teacher_id, type,
     new_bunny_video_id, reason, status, review_note, reviewed_by, reviewed_at, created_at)
  values
    -- PENDENTE: troca de vídeo, o antigo continua no ar até você aprovar
    ('d1000000-0000-4000-8000-000000000001',
     (select id from public.lessons where id = 'c3000000-0000-4000-8000-000000000013'), 'Dobras e ponto de fermentação',
     c_pao, v_marina, 'replace_video',
     'hml-bunny-regravado-0013',
     'Regravei com câmera de cima. No vídeo antigo a mão tapa a massa bem na hora da dobra e três alunos comentaram que não dava pra ver.',
     'pending', null, null, null, now() - interval '2 days'),

    -- PENDENTE: remoção
    ('d1000000-0000-4000-8000-000000000002',
     (select id from public.lessons where id = 'c3000000-0000-4000-8000-000000000023'), 'Merengues francês e suíço',
     c_confeit, v_marina, 'remove',
     null,
     'Vou quebrar esta aula em duas (uma por tipo de merengue) e subir separadas. Esta versão fica confusa.',
     'pending', null, null, null, now() - interval '5 hours'),

    -- HISTÓRICO: aprovado
    ('d1000000-0000-4000-8000-000000000003',
     (select id from public.lessons where id = 'c3000000-0000-4000-8000-000000000015'), 'Forno com vapor em casa',
     c_pao, v_marina, 'replace_video',
     'hml-bunny-vapor-v2',
     'Áudio estourado nos primeiros 40 segundos.',
     'approved', 'Confirmado o problema de áudio. Aprovado.',
     v_owner, now() - interval '7 days', now() - interval '8 days'),

    -- HISTÓRICO: rejeitado
    ('d1000000-0000-4000-8000-000000000004',
     (select id from public.lessons where id = 'c3000000-0000-4000-8000-000000000022'), 'Creme de confeiteiro',
     c_confeit, v_marina, 'remove',
     null,
     'Queria tirar por enquanto.',
     'rejected', 'Aula é pré-requisito da montagem do mil-folhas. Remover deixaria buraco na trilha de quem já comprou.',
     v_owner, now() - interval '15 days', now() - interval '16 days')
  on conflict (id) do nothing;

  -- ------------------------------------------------------------
  -- 7. PEDIDOS DE PRODUTO DO PROFESSOR  →  /admin/produtos
  -- ------------------------------------------------------------
  insert into public.product_requests
    (id, teacher_id, name, description, reference_url, suggested_price,
     lesson_id, status, review_note, reviewed_by, reviewed_at, product_id, created_at)
  values
    ('e2000000-0000-4000-8000-000000000001', v_marina,
     'Lâmina de pão (grignette) com cabo de madeira',
     'Pra marcar o pão antes de assar. Hoje mando os alunos usarem gilete presa em palito, o que é meio constrangedor de recomendar.',
     'https://www.exemplo.com.br/grignette-artesanal', 49.90,
     (select id from public.lessons where id = 'c3000000-0000-4000-8000-000000000014'),
     'pending', null, null, null, null, now() - interval '3 days'),

    ('e2000000-0000-4000-8000-000000000002', v_bruno,
     'Termômetro de espeto para churrasco, sonda dupla',
     'Duas sondas: uma na carne, outra no ambiente da churrasqueira. É o que resolve o "ponto por adivinhação" que eu critico na aula 2.',
     'https://www.exemplo.com.br/termometro-sonda-dupla', 219.00,
     null,
     'pending', null, null, null, null, now() - interval '1 day'),

    ('e2000000-0000-4000-8000-000000000003', v_marina,
     'Termômetro digital instantâneo',
     'Preciso de um termômetro pra indicar na aula de temperatura de massa.',
     'https://www.exemplo.com.br/termometro', 129.00,
     (select id from public.lessons where id = 'c3000000-0000-4000-8000-000000000012'),
     'approved', 'Já tínhamos equivalente no catálogo. Vinculado ao produto existente em vez de cadastrar duplicado.',
     v_owner, now() - interval '25 days', p_termometro, now() - interval '27 days')
  on conflict (id) do nothing;

  -- ------------------------------------------------------------
  -- 8. REPASSES AO PROFESSOR  →  /admin/financeiro
  -- Comissão da Marina é 15%, então ela recebe 85% da venda.
  -- O clawback negativo é o estorno do reembolso do Eduardo (decisão 2.4):
  -- o dinheiro voltou pro aluno, então sai do repasse do professor.
  -- ------------------------------------------------------------
  insert into public.teacher_payouts
    (id, teacher_id, amount, status, stripe_transfer_id,
     period_start, period_end, type, enrollment_id, order_id, created_at)
  values
    -- Já pago
    ('f3000000-0000-4000-8000-000000000001', v_marina, 99.37, 'paid',
     'tr_hmlseed_marina_jul', date '2026-07-01', date '2026-07-31',
     'sale', e_ana_pao, null, now() - interval '21 days'),

    -- Estorno do reembolso do Eduardo
    ('f3000000-0000-4000-8000-000000000002', v_marina, -110.42, 'paid',
     'tr_hmlseed_clawback_edu', date '2026-08-01', date '2026-08-31',
     'refund_clawback', e_edu_pao, null, now() - interval '10 days'),

    -- FILA: pendente de transferência
    ('f3000000-0000-4000-8000-000000000003', v_marina, 161.42, 'pending', null,
     date '2026-08-01', date '2026-08-31', 'sale', e_carlos_conf, null,
     now() - interval '12 days'),

    ('f3000000-0000-4000-8000-000000000004', v_marina, 127.42, 'pending', null,
     date '2026-08-01', date '2026-08-31', 'sale', e_dani_massas, null,
     now() - interval '5 days'),

    -- Falhou: conta Stripe do professor rejeitou a transferência
    ('f3000000-0000-4000-8000-000000000005', v_bruno, 84.00, 'failed', null,
     date '2026-07-01', date '2026-07-31', 'sale', null, null,
     now() - interval '19 days')
  on conflict (id) do nothing;

  -- ------------------------------------------------------------
  -- 9. MATERIAL DE APOIO
  -- ------------------------------------------------------------
  -- lesson_attachments.lesson_id é NOT NULL, então aqui não dá pra anular:
  -- o join descarta a linha toda quando a aula não existe.
  insert into public.lesson_attachments (id, lesson_id, name, file_url, created_at)
  select v.id, v.lesson_id, v.nome, v.url, v.criado
  from (values
    ('a4000000-0000-4000-8000-000000000001'::uuid, 'c3000000-0000-4000-8000-000000000011'::uuid,
     'Cronograma de alimentação do levain (7 dias).pdf',
     'https://exemplo.chefio.test/anexos/cronograma-levain.pdf', (now() - interval '30 days')::timestamptz),
    ('a4000000-0000-4000-8000-000000000002'::uuid, 'c3000000-0000-4000-8000-000000000013'::uuid,
     'Tabela de hidratação x tipo de farinha.pdf',
     'https://exemplo.chefio.test/anexos/hidratacao-farinha.pdf', (now() - interval '30 days')::timestamptz),
    ('a4000000-0000-4000-8000-000000000003'::uuid, 'c3000000-0000-4000-8000-000000000021'::uuid,
     'Passo a passo das voltas da folhada.pdf',
     'https://exemplo.chefio.test/anexos/voltas-folhada.pdf', (now() - interval '28 days')::timestamptz),
    ('a4000000-0000-4000-8000-000000000004'::uuid, 'c3000000-0000-4000-8000-000000000031'::uuid,
     'Proporções de massa de ovos por número de porções.pdf',
     'https://exemplo.chefio.test/anexos/proporcoes-massa.pdf', (now() - interval '26 days')::timestamptz)
  ) as v(id, lesson_id, nome, url, criado)
  join public.lessons l on l.id = v.lesson_id
  on conflict (id) do nothing;

  insert into public.documents (id, teacher_id, name, file_url, file_type, created_at)
  values
    ('a5000000-0000-4000-8000-000000000001', v_marina,
     'Contrato de professor assinado.pdf',
     'https://exemplo.chefio.test/docs/contrato-marina.pdf', 'application/pdf',
     now() - interval '36 days'),
    ('a5000000-0000-4000-8000-000000000002', v_marina,
     'Comprovante de conta bancária.pdf',
     'https://exemplo.chefio.test/docs/banco-marina.pdf', 'application/pdf',
     now() - interval '36 days'),
    ('a5000000-0000-4000-8000-000000000003', v_bruno,
     'Contrato de professor assinado.pdf',
     'https://exemplo.chefio.test/docs/contrato-bruno.pdf', 'application/pdf',
     now() - interval '24 days')
  on conflict (id) do nothing;

  raise notice 'Seed de movimento concluído.';
end $$;


-- ============================================================
-- CONFERÊNCIA — o que cada tela do admin deve mostrar agora
-- ============================================================
select 'professores aguardando aprovação' as fila, count(*)::text as total
  from public.teacher_profiles where status = 'pending'
union all select 'cursos aguardando revisão', count(*)::text
  from public.courses where status = 'pending_review'
union all select 'reembolsos de curso pendentes', count(*)::text
  from public.enrollments where refund_status = 'requested'
union all select 'devoluções de produto pendentes', count(*)::text
  from public.orders where return_status = 'requested'
union all select 'pedidos pagos aguardando envio', count(*)::text
  from public.orders where status = 'paid'
union all select 'alterações de aula pendentes', count(*)::text
  from public.lesson_change_requests where status = 'pending'
union all select 'pedidos de produto pendentes', count(*)::text
  from public.product_requests where status = 'pending'
union all select 'repasses pendentes', count(*)::text
  from public.teacher_payouts where status = 'pending'
union all select 'cupons ativos', count(*)::text
  from public.coupons where active
union all select 'matrículas', count(*)::text from public.enrollments
union all select 'pedidos', count(*)::text from public.orders;


-- ============================================================
-- LIMPEZA — se quiser desfazer só o movimento forjado
-- ============================================================
-- delete from public.teacher_payouts where stripe_transfer_id like 'tr_hmlseed_%' or id::text like 'f3000000%';
-- delete from public.orders where stripe_payment_intent_id like 'pi_hmlseed_%' or id::text like 'f6000000%';
-- delete from public.enrollments where stripe_payment_intent_id like 'pi_hmlseed_%' or id::text like 'e5000000%';
