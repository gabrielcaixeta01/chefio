-- ============================================================
-- Seed de dados de demonstração — Chefio
-- Cole no SQL Editor do Supabase e rode. Pode rodar mais de uma vez:
-- todos os inserts usam UUID fixo + `on conflict do nothing`.
--
-- O QUE ELE **NÃO** CRIA, de propósito:
--   • enrollments, orders, teacher_payouts — esses precisam nascer do
--     fluxo real (comprar, se inscrever, pagar). Se o seed os inventasse,
--     você não teria como distinguir "o checkout funcionou" de "o seed
--     colocou a linha lá". Os três fluxos de dinheiro nunca rodaram contra
--     este banco; é justamente isso que falta testar.
--   • usuários — auth.users é gerenciado pelo GoTrue, com colunas e
--     hashes que não se preenchem à mão de forma confiável. Crie contas
--     pela tela de cadastro.
--
-- O professor é descoberto pelo banco (primeiro teacher_profiles ativo),
-- não fica cravado, então continua valendo se você recriar o usuário.
-- ============================================================

do $$
declare
  v_teacher uuid;

  -- UUIDs fixos: é o que torna o script re-executável sem duplicar.
  c_gratis     uuid := 'a1000000-0000-4000-8000-000000000001';
  c_pao        uuid := 'a1000000-0000-4000-8000-000000000002';
  c_confeit    uuid := 'a1000000-0000-4000-8000-000000000003';
  c_massas     uuid := 'a1000000-0000-4000-8000-000000000004';
  c_revisao    uuid := 'a1000000-0000-4000-8000-000000000005';

  p_forma      uuid := 'b2000000-0000-4000-8000-000000000001';
  p_batedeira  uuid := 'b2000000-0000-4000-8000-000000000002';
  p_termometro uuid := 'b2000000-0000-4000-8000-000000000003';
  p_faca       uuid := 'b2000000-0000-4000-8000-000000000004';
  p_bancada    uuid := 'b2000000-0000-4000-8000-000000000005';
  p_esgotado   uuid := 'b2000000-0000-4000-8000-000000000006';
begin
  select tp.user_id into v_teacher
  from public.teacher_profiles tp
  join public.profiles p on p.id = tp.user_id
  where tp.status = 'active' and p.role = 'teacher'
  order by tp.created_at
  limit 1;

  if v_teacher is null then
    raise exception
      'Nenhum professor ativo encontrado. Aprove um professor em /admin/professores (ou rode a 00011) antes deste seed.';
  end if;

  raise notice 'Usando professor %', v_teacher;

  -- ------------------------------------------------------------
  -- CURSOS
  -- O primeiro é GRÁTIS de propósito: é o único fluxo de matrícula que
  -- roda de ponta a ponta sem Stripe configurado, porque a rota de
  -- checkout trata price = 0 antes de exigir a STRIPE_SECRET_KEY.
  -- O último fica em pending_review pra você ter o que aprovar em
  -- /admin/cursos e exercitar o trigger courses_guard_status_change.
  -- ------------------------------------------------------------
  insert into public.courses
    (id, teacher_id, title, slug, description, thumbnail_url, price, category, status)
  values
    (c_gratis, v_teacher,
     'Primeiros passos na cozinha',
     'primeiros-passos-na-cozinha',
     'Um curso introdutório gratuito: como segurar a faca, controlar o fogo, temperar no ponto e montar um prato simples do começo ao fim. Feito para quem nunca cozinhou.',
     'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=1200&q=80',
     0, 'Culinária Geral', 'approved'),

    (c_pao, v_teacher,
     'Pão de fermentação natural',
     'pao-de-fermentacao-natural',
     'Do levain ao forno: alimentação da isca, autólise, dobras, ponto de fermentação e assamento com vapor. Inclui a leitura da massa pelo tato, que é o que separa pão bom de pão sofrível.',
     'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=80',
     129.90, 'Panificação', 'approved'),

    (c_confeit, v_teacher,
     'Confeitaria francesa do zero',
     'confeitaria-francesa-do-zero',
     'Massa folhada, creme de confeiteiro, merengues e as bases que sustentam quase toda a confeitaria clássica. Cada técnica é mostrada com o erro comum ao lado do acerto.',
     'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80',
     189.90, 'Confeitaria', 'approved'),

    (c_massas, v_teacher,
     'Massas frescas artesanais',
     'massas-frescas-artesanais',
     'Massa de ovos, sêmola e recheios. Espessura, descanso, corte e os molhos que combinam com cada formato — sem máquina cara, só rolo e bancada.',
     null,  -- sem capa de propósito: exercita o fallback de azulejo do CourseCard
     149.90, 'Massas', 'approved'),

    (c_revisao, v_teacher,
     'Churrasco: cortes e brasa',
     'churrasco-cortes-e-brasa',
     'Escolha de corte, preparo da brasa, controle de temperatura e ponto de carne. Curso enviado para revisão — use este para testar aprovação e rejeição no painel do admin.',
     'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80',
     159.90, 'Churrasco e Carnes', 'pending_review')
  on conflict (id) do nothing;

  -- ------------------------------------------------------------
  -- AULAS
  -- bunny_video_id fica null porque o Bunny ainda não está configurado —
  -- a tela mostra "Vídeo ainda não disponível", que é o comportamento
  -- correto. Quando configurar, o upload preenche pelo formulário.
  -- A primeira aula de cada curso é preview gratuito.
  -- ------------------------------------------------------------
  insert into public.lessons
    (id, course_id, title, description, duration_seconds, order_index, is_free_preview)
  values
    -- Grátis
    ('c3000000-0000-4000-8000-000000000001', c_gratis, 'A faca e o corte',            'Pega, afiação e os três cortes que resolvem 90% das receitas.', 720,  1, true),
    ('c3000000-0000-4000-8000-000000000002', c_gratis, 'Controle de fogo',            'Por que quase tudo queima: entendendo alto, médio e baixo de verdade.', 640,  2, false),
    ('c3000000-0000-4000-8000-000000000003', c_gratis, 'Sal, ácido e gordura',        'Temperar em camadas em vez de salgar no fim.', 900,  3, false),
    ('c3000000-0000-4000-8000-000000000004', c_gratis, 'Montando o primeiro prato',   'Juntando tudo: um refogado completo, do mise en place ao prato.', 1180, 4, false),

    -- Pão
    ('c3000000-0000-4000-8000-000000000011', c_pao, 'Criando e alimentando o levain', 'Farinha, água e paciência: os sete primeiros dias.', 830,  1, true),
    ('c3000000-0000-4000-8000-000000000012', c_pao, 'Autólise e mistura',             'Hidratação, descanso e por que não se sova massa de alta hidratação.', 1020, 2, false),
    ('c3000000-0000-4000-8000-000000000013', c_pao, 'Dobras e ponto de fermentação',  'Lendo a massa pelo tato em vez de pelo relógio.', 1340, 3, false),
    ('c3000000-0000-4000-8000-000000000014', c_pao, 'Modelagem e cesto',              'Tensão de superfície: o que faz o pão crescer para cima.', 960,  4, false),
    ('c3000000-0000-4000-8000-000000000015', c_pao, 'Forno com vapor em casa',        'Panela de ferro, pedra e os truques que substituem o forno profissional.', 1150, 5, false),

    -- Confeitaria
    ('c3000000-0000-4000-8000-000000000021', c_confeit, 'Massa folhada: a dobra',     'Manteiga na temperatura certa e as voltas que criam as camadas.', 1450, 1, true),
    ('c3000000-0000-4000-8000-000000000022', c_confeit, 'Creme de confeiteiro',       'Ovos, amido e o ponto exato antes de talhar.', 890,  2, false),
    ('c3000000-0000-4000-8000-000000000023', c_confeit, 'Merengues francês e suíço',  'Quando usar cada um, e por que o seu murcha.', 760,  3, false),
    ('c3000000-0000-4000-8000-000000000024', c_confeit, 'Montagem de um mil-folhas',  'Juntando folhada e creme sem encharcar.', 1080, 4, false),

    -- Massas
    ('c3000000-0000-4000-8000-000000000031', c_massas, 'Massa de ovos',               'Proporção, sova e descanso.', 700,  1, true),
    ('c3000000-0000-4000-8000-000000000032', c_massas, 'Abrindo com rolo',            'Espessura uniforme sem máquina.', 820,  2, false),
    ('c3000000-0000-4000-8000-000000000033', c_massas, 'Recheios e selagem',          'Ravióli que não abre na água fervente.', 940,  3, false),

    -- Churrasco (em revisão)
    ('c3000000-0000-4000-8000-000000000041', c_revisao, 'Escolhendo o corte',         'Marmoreio, espessura e o que pedir no açougue.', 680,  1, true),
    ('c3000000-0000-4000-8000-000000000042', c_revisao, 'Montando a brasa',           'Zonas de calor: direta, indireta e o descanso.', 750,  2, false)
  on conflict (id) do nothing;

  -- ------------------------------------------------------------
  -- PRODUTOS
  -- Estoque > 0 é obrigatório pra loja funcionar: o checkout reprova
  -- qualquer item com quantidade acima do saldo, e o default da tabela
  -- é 0 — foi o que travou a loja até agora. O último fica zerado de
  -- propósito, pra você ver o aviso vermelho em /admin/produtos e o
  -- bloqueio no carrinho.
  -- ------------------------------------------------------------
  insert into public.products
    (id, name, description, price, image_url, stock, is_active)
  values
    (p_forma,      'Cesto de fermentação (banneton) 25cm',
                   'Rattan natural, para pães de até 1kg. Marca a espiral clássica na crosta.',
                   89.90,  'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80', 24, true),
    (p_batedeira,  'Raspador de massa em aço inox',
                   'Corta, porciona e limpa a bancada. O utensílio mais usado da panificação.',
                   34.50,  'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&q=80',    60, true),
    (p_termometro, 'Termômetro digital instantâneo',
                   'Leitura em 3 segundos, -50°C a 300°C. Ponto de carne e de calda sem adivinhação.',
                   119.00, 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=600&q=80', 18, true),
    (p_faca,       'Faca do chef 20cm',
                   'Aço carbono japonês, cabo de pakkawood. Peso equilibrado para corte contínuo.',
                   289.90, 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=600&q=80', 9,  true),
    (p_bancada,    'Tábua de corte em madeira 40x30',
                   null,  -- sem imagem de propósito: exercita o placeholder da loja
                   159.90, null, 12, true),
    (p_esgotado,   'Forma de silicone para mil-folhas',
                   'Antiaderente, resistente até 230°C. Produto em reposição.',
                   74.90,  null, 0,  true)
  on conflict (id) do nothing;

  -- ------------------------------------------------------------
  -- PRODUTOS RECOMENDADOS POR AULA
  -- É o que faz aparecer o bloco "Produtos desta aula" no player e o
  -- upsell dentro do curso.
  -- ------------------------------------------------------------
  insert into public.lesson_products (lesson_id, product_id) values
    ('c3000000-0000-4000-8000-000000000001', p_faca),          -- A faca e o corte
    ('c3000000-0000-4000-8000-000000000001', p_bancada),
    ('c3000000-0000-4000-8000-000000000003', p_termometro),    -- Sal, ácido e gordura
    ('c3000000-0000-4000-8000-000000000012', p_batedeira),     -- Autólise e mistura
    ('c3000000-0000-4000-8000-000000000014', p_forma),         -- Modelagem e cesto
    ('c3000000-0000-4000-8000-000000000015', p_termometro),    -- Forno com vapor
    ('c3000000-0000-4000-8000-000000000021', p_batedeira),     -- Massa folhada
    ('c3000000-0000-4000-8000-000000000024', p_esgotado),      -- Mil-folhas (produto sem estoque)
    ('c3000000-0000-4000-8000-000000000031', p_bancada)        -- Massa de ovos
  on conflict (lesson_id, product_id) do nothing;

  raise notice 'Seed concluído.';
end
$$;

-- ============================================================
-- Resumo do que existe agora
-- ============================================================
select 'cursos aprovados'   as item, count(*)::text as total from public.courses where status = 'approved'
union all
select 'cursos em revisão',  count(*)::text from public.courses where status = 'pending_review'
union all
select 'aulas',              count(*)::text from public.lessons
union all
select 'produtos ativos',    count(*)::text from public.products where is_active
union all
select 'produtos sem estoque', count(*)::text from public.products where is_active and stock = 0
union all
select 'vínculos aula↔produto', count(*)::text from public.lesson_products
union all
select 'matrículas (deve ser 0 até você testar a compra)', count(*)::text from public.enrollments
union all
select 'pedidos (deve ser 0 até você testar a loja)',       count(*)::text from public.orders;
