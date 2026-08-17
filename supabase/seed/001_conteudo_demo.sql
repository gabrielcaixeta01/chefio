-- ============================================================
-- SEED 001: conteúdo de demonstração (catálogo de cursos + loja)
--
-- Como usar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Pode rodar quantas vezes quiser — é idempotente.
--
-- O que entra:
--   - 10 cursos aprovados, um por categoria de COURSE_CATEGORIES (lib/utils.ts)
--   - 5 aulas por curso (50 no total), a primeira sempre como preview grátis
--   - 12 produtos ativos na loja
--
-- O que NÃO entra:
--   - Vídeo. As aulas ficam com bunny_video_url nulo, então o player não
--     reproduz nada. Serve pra encher o catálogo e a página do curso, não
--     pra testar a experiência de assistir.
--   - Matrículas, progresso e pedidos.
--
-- Pré-requisito: precisa existir pelo menos uma conta com role = 'teacher'.
-- Os cursos são pendurados no professor mais antigo. Sem isso o script para
-- e avisa — forjar linha em auth.users quebra o login depois.
-- ============================================================

do $$
declare
  v_teacher   uuid;
  v_nome      text;
  v_cursos    integer;
  v_aulas     integer;
  v_produtos  integer;
begin
  -- ----------------------------------------------------------
  -- 1. Acha o professor dono do conteúdo
  -- ----------------------------------------------------------
  select p.id, p.name
    into v_teacher, v_nome
  from public.profiles p
  where p.role = 'teacher'
  order by p.created_at nulls last, p.id
  limit 1;

  if v_teacher is null then
    raise exception 'Nenhum profile com role = ''teacher'' encontrado.'
      using hint = 'Cadastre um professor em /cadastro (ou rode: update public.profiles set role = ''teacher'' where id = ''<uuid>'';) e rode este script de novo.';
  end if;

  raise notice 'Professor escolhido: % (%)', v_nome, v_teacher;

  -- ----------------------------------------------------------
  -- 2. Cursos
  -- ----------------------------------------------------------
  create temp table tmp_cursos (
    slug          text,
    title         text,
    description   text,
    thumbnail_url text,
    price         numeric(10,2),
    category      text
  ) on commit drop;

  insert into tmp_cursos values
    ('fundamentos-da-cozinha',
     'Fundamentos da Cozinha',
     'O curso que devia vir antes de todos os outros. Corte, calor, sal e gordura: as quatro alavancas que decidem se um prato dá certo. Você aprende a afiar e usar a faca sem medo, a diferença entre refogar e selar, e por que quase toda receita que sai sem graça está só mal temperada. Ao final você cozinha sem receita.',
     'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80',
     0, 'Culinária Geral'),

    ('pao-de-fermentacao-natural',
     'Pão de Fermentação Natural',
     'Do fermento selvagem à crosta que estala. Você cria e mantém seu levain, entende hidratação, autólise e ponto de véu, e domina a fermentação longa na geladeira — a técnica que faz pão de padaria caber na sua rotina. Inclui fornada em forno doméstico, sem panela de ferro cara.',
     'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=80',
     249.90, 'Panificação'),

    ('confeitaria-francesa-do-zero',
     'Confeitaria Francesa do Zero',
     'Confeitaria é química com prazo. Aqui você aprende as cinco massas-base, o creme de confeiteiro que não talha e o merengue que não chora, e monta as sobremesas clássicas em cima delas. Todas as receitas vêm com peso em gramas e explicação do porquê de cada etapa.',
     'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=1200&q=80',
     329.90, 'Confeitaria'),

    ('cozinha-do-mediterraneo',
     'Cozinha do Mediterrâneo',
     'Uma volta pela Grécia, sul da Itália, Líbano e Marrocos pelo que essas cozinhas têm em comum: azeite bom, vegetal no auge, ácido na hora certa. Você monta mezze completo, aprende a temperar cordeiro e descobre que a maior parte desses pratos leva menos de trinta minutos.',
     'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80',
     189.90, 'Gastronomia Internacional'),

    ('cozinha-vegetal-sem-substituto',
     'Cozinha Vegetal sem Substituto',
     'Nenhuma imitação de carne aqui. O curso trata o vegetal como ingrediente principal e ataca o problema real da comida vegana: falta de umami e de textura. Você aprende fermentados rápidos, caldos escuros de cogumelo, defumação caseira e assados que ficam crocantes por fora e cremosos por dentro.',
     'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&q=80',
     179.90, 'Culinária Vegana/Vegetariana'),

    ('churrasco-e-cortes',
     'Churrasco e Cortes',
     'Começa no açougue: como reconhecer um corte bom, o que a marmorização entrega e por que maturação muda tudo. Depois vai pro fogo — brasa direta, indireta, defumação lenta e o ponto medido com termômetro, não com chute. Inclui as carnes baratas que ficam melhores que picanha quando bem tratadas.',
     'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80',
     219.90, 'Churrasco e Carnes'),

    ('peixes-e-frutos-do-mar',
     'Peixes e Frutos do Mar',
     'A maioria das pessoas cozinha peixe demais. Este curso resolve isso: como escolher peixe fresco na feira, filetar inteiro sem desperdiçar, e os quatro métodos de cocção que respeitam cada tipo de carne. Tem também moluscos, crustáceos e o caldo que se faz com o que sobra.',
     'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80',
     239.90, 'Frutos do Mar'),

    ('massas-frescas-artesanais',
     'Massas Frescas Artesanais',
     'Farinha, ovo e paciência. Você aprende a massa amarela do norte da Itália e a massa de semolina e água do sul, abre no rolo e na máquina, e fecha os recheados sem deixar bolha de ar. Fecha com os molhos que existem pra servir a massa — e não o contrário.',
     'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1200&q=80',
     199.90, 'Massas'),

    ('coquetelaria-classica',
     'Coquetelaria Clássica',
     'Toda a coquetelaria clássica cabe em umas poucas famílias. Entendendo as proporções de cada uma, você para de decorar receita e passa a criar. Inclui xaropes e infusões caseiras, técnica de gelo, batida versus mexida, e versões sem álcool que não são refrigerante com hortelã.',
     'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=1200&q=80',
     159.90, 'Bebidas e Coquetéis'),

    ('comida-de-verdade-no-dia-a-dia',
     'Comida de Verdade no Dia a Dia',
     'Alimentação saudável que sobrevive a uma semana corrida. Você monta prato equilibrado sem pesar nada, cozinha em lote sem comer a mesma coisa cinco dias seguidos, e aprende a fazer a lista de compras que elimina a decisão diária. Sem dieta restritiva e sem ingrediente caro.',
     'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=1200&q=80',
     129.90, 'Nutrição e Alimentação Saudável');

  insert into public.courses
    (teacher_id, title, slug, description, thumbnail_url, price, category, status)
  select v_teacher, t.title, t.slug, t.description, t.thumbnail_url, t.price, t.category, 'approved'
  from tmp_cursos t
  on conflict (slug) do update set
    teacher_id      = excluded.teacher_id,
    title           = excluded.title,
    description     = excluded.description,
    thumbnail_url   = excluded.thumbnail_url,
    price           = excluded.price,
    category        = excluded.category,
    status          = 'approved',
    rejection_reason = null;

  get diagnostics v_cursos = row_count;

  -- ----------------------------------------------------------
  -- 3. Aulas
  --    Apaga e reinsere só as aulas dos cursos acima — rodar de novo
  --    não duplica nem mexe em curso que você criou pela interface.
  -- ----------------------------------------------------------
  create temp table tmp_aulas (
    course_slug      text,
    order_index      integer,
    title            text,
    description      text,
    duration_seconds integer,
    is_free_preview  boolean
  ) on commit drop;

  insert into tmp_aulas values
    -- Fundamentos da Cozinha
    ('fundamentos-da-cozinha', 1, 'A faca e o corte', 'Como segurar, como afiar e os quatro cortes que resolvem 90% das receitas.', 1080, true),
    ('fundamentos-da-cozinha', 2, 'Calor: os cinco métodos', 'Refogar, selar, assar, cozer e fritar — quando cada um serve e por quê.', 1440, false),
    ('fundamentos-da-cozinha', 3, 'Sal, ácido e gordura', 'Os três temperos estruturais e como corrigir prato sem graça.', 1260, false),
    ('fundamentos-da-cozinha', 4, 'Mise en place de verdade', 'Organizar a bancada pra cozinhar rápido sem virar bagunça.', 900, false),
    ('fundamentos-da-cozinha', 5, 'Cozinhar sem receita', 'Montando pratos a partir do que tem na geladeira.', 1620, false),

    -- Pão de Fermentação Natural
    ('pao-de-fermentacao-natural', 1, 'Criando o levain', 'Farinha, água e sete dias. O que observar em cada um deles.', 1200, true),
    ('pao-de-fermentacao-natural', 2, 'Hidratação e autólise', 'Por que massa molhada assusta e como parar de ter medo dela.', 1560, false),
    ('pao-de-fermentacao-natural', 3, 'Dobras e ponto de véu', 'Construindo glúten sem sovar até o braço doer.', 1380, false),
    ('pao-de-fermentacao-natural', 4, 'Fermentação longa na geladeira', 'A técnica que faz o pão caber na sua semana.', 1140, false),
    ('pao-de-fermentacao-natural', 5, 'Fornada em forno doméstico', 'Vapor, temperatura e a crosta que estala sem panela de ferro.', 1800, false),

    -- Confeitaria Francesa do Zero
    ('confeitaria-francesa-do-zero', 1, 'Pesar é obrigatório', 'Por que confeitaria não aceita xícara e como montar sua régua.', 840, true),
    ('confeitaria-francesa-do-zero', 2, 'As massas-base', 'Brisée, sucrée, folhada, choux e genoise em uma aula só.', 2100, false),
    ('confeitaria-francesa-do-zero', 3, 'Creme de confeiteiro e derivados', 'A base que vira mousseline, diplomata e chiboust.', 1500, false),
    ('confeitaria-francesa-do-zero', 4, 'Merengues e o ponto certo', 'Francês, italiano e suíço — qual usar em cada sobremesa.', 1320, false),
    ('confeitaria-francesa-do-zero', 5, 'Montagem e acabamento', 'Camadas, glaçagem e o que fazer quando desanda.', 1680, false),

    -- Cozinha do Mediterrâneo
    ('cozinha-do-mediterraneo', 1, 'Azeite, ácido e ervas', 'Os três eixos que amarram toda a região.', 960, true),
    ('cozinha-do-mediterraneo', 2, 'Mezze completo', 'Homus, babaganuche, tabule e pão sírio na chapa.', 1740, false),
    ('cozinha-do-mediterraneo', 3, 'Sul da Itália', 'Vegetais grelhados, peixe assado inteiro e massa de semolina.', 1500, false),
    ('cozinha-do-mediterraneo', 4, 'Marrocos e o tagine', 'Especiarias em camadas e cocção lenta sem panela especial.', 1620, false),
    ('cozinha-do-mediterraneo', 5, 'Cordeiro sem erro', 'Tempero, ponto e descanso pro cordeiro não ficar pesado.', 1380, false),

    -- Cozinha Vegetal sem Substituto
    ('cozinha-vegetal-sem-substituto', 1, 'O problema do umami', 'Por que comida vegana costuma faltar profundidade — e como resolver.', 1140, true),
    ('cozinha-vegetal-sem-substituto', 2, 'Caldos escuros', 'Cogumelo tostado, alga e legumes queimados: a base de tudo.', 1260, false),
    ('cozinha-vegetal-sem-substituto', 3, 'Textura e crocância', 'Assados que ficam crocantes por fora e cremosos por dentro.', 1440, false),
    ('cozinha-vegetal-sem-substituto', 4, 'Fermentados rápidos', 'Picles, conservas e molhos que dão ácido e sal ao mesmo tempo.', 1200, false),
    ('cozinha-vegetal-sem-substituto', 5, 'Montando o prato principal', 'Estruturar refeição vegetal que sacia de verdade.', 1560, false),

    -- Churrasco e Cortes
    ('churrasco-e-cortes', 1, 'Escolhendo no açougue', 'Marmorização, maturação e os cortes baratos que valem a pena.', 1080, true),
    ('churrasco-e-cortes', 2, 'Fogo direto e indireto', 'Montando duas zonas de calor na churrasqueira que você tem.', 1320, false),
    ('churrasco-e-cortes', 3, 'Ponto medido, não chutado', 'Termômetro, temperatura-alvo e o descanso obrigatório.', 1020, false),
    ('churrasco-e-cortes', 4, 'Defumação lenta', 'Costela e paleta em cocção longa sem defumador profissional.', 2040, false),
    ('churrasco-e-cortes', 5, 'Sal, marinada e crosta', 'Quando salgar, quando não marinar e como formar crosta.', 1200, false),

    -- Peixes e Frutos do Mar
    ('peixes-e-frutos-do-mar', 1, 'Comprando peixe fresco', 'O que olhar na feira e o que ignorar no supermercado.', 900, true),
    ('peixes-e-frutos-do-mar', 2, 'Filetando inteiro', 'Do peixe fechado aos filés, sem desperdiçar carne.', 1680, false),
    ('peixes-e-frutos-do-mar', 3, 'Quatro métodos de cocção', 'Grelhado, assado, escalfado e cru — qual peixe pede qual.', 1560, false),
    ('peixes-e-frutos-do-mar', 4, 'Moluscos e crustáceos', 'Limpeza, ponto e o que fazer com camarão congelado.', 1380, false),
    ('peixes-e-frutos-do-mar', 5, 'Caldo com as sobras', 'Cabeça e espinha viram fumet — a base de arroz e risoto.', 1140, false),

    -- Massas Frescas Artesanais
    ('massas-frescas-artesanais', 1, 'Duas massas, duas escolas', 'Ovo e farinha 00 no norte, semolina e água no sul.', 1200, true),
    ('massas-frescas-artesanais', 2, 'Abrindo no rolo e na máquina', 'Espessura, descanso e como não deixar grudar.', 1440, false),
    ('massas-frescas-artesanais', 3, 'Formatos cortados', 'Tagliatelle, pappardelle e orecchiette feitas à mão.', 1320, false),
    ('massas-frescas-artesanais', 4, 'Recheados sem bolha de ar', 'Ravioli e tortellini que não abrem na água.', 1620, false),
    ('massas-frescas-artesanais', 5, 'O molho serve a massa', 'Emulsão na frigideira e a água do cozimento como ingrediente.', 1260, false),

    -- Coquetelaria Clássica
    ('coquetelaria-classica', 1, 'As famílias de drinks', 'Sour, old fashioned, highball e martini: proporções que se repetem.', 1020, true),
    ('coquetelaria-classica', 2, 'Batido ou mexido', 'O que cada técnica faz com diluição, textura e temperatura.', 900, false),
    ('coquetelaria-classica', 3, 'Gelo é ingrediente', 'Tamanho, clareza e por que gelo ruim estraga drink bom.', 840, false),
    ('coquetelaria-classica', 4, 'Xaropes e infusões', 'Preparos caseiros que substituem licor caro.', 1140, false),
    ('coquetelaria-classica', 5, 'Sem álcool, com estrutura', 'Drinks zero álcool que têm amargor, acidez e corpo.', 1200, false),

    -- Comida de Verdade no Dia a Dia
    ('comida-de-verdade-no-dia-a-dia', 1, 'Prato equilibrado sem balança', 'Proporção visual que funciona sem contar caloria.', 780, true),
    ('comida-de-verdade-no-dia-a-dia', 2, 'Cozinhar em lote', 'Preparos-base que viram pratos diferentes na semana.', 1500, false),
    ('comida-de-verdade-no-dia-a-dia', 3, 'A lista de compras', 'Comprar uma vez e eliminar a decisão diária.', 960, false),
    ('comida-de-verdade-no-dia-a-dia', 4, 'Marmita que não enjoa', 'Variação com o mesmo preparo e conservação correta.', 1320, false),
    ('comida-de-verdade-no-dia-a-dia', 5, 'Café da manhã e lanches', 'Opções rápidas pra não cair no ultraprocessado às 16h.', 1080, false);

  delete from public.lessons l
  using public.courses c, tmp_cursos t
  where l.course_id = c.id
    and c.slug = t.slug;

  insert into public.lessons
    (course_id, title, description, duration_seconds, order_index, is_free_preview)
  select c.id, a.title, a.description, a.duration_seconds, a.order_index, a.is_free_preview
  from tmp_aulas a
  join public.courses c on c.slug = a.course_slug;

  get diagnostics v_aulas = row_count;

  -- ----------------------------------------------------------
  -- 4. Produtos da loja
  --    Entram só se ainda não existir produto com o mesmo nome.
  -- ----------------------------------------------------------
  insert into public.products (name, description, price, image_url, stock, is_active)
  select p.name, p.description, p.price, p.image_url, p.stock, true
  from (values
    ('Faca do Chef 20cm',            'Aço inox forjado, lâmina de 20cm e cabo equilibrado. A única faca que você realmente precisa comprar boa.', 389.90, 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800&q=80', 24),
    ('Tábua de Corte em Madeira',    'Madeira maciça tratada, 40x30cm, com canaleta pra líquido. Não cega a faca como as de vidro.', 179.90, 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=800&q=80', 40),
    ('Frigideira de Ferro 26cm',     'Ferro fundido pré-curado. Sela carne de verdade e vai do fogão ao forno.', 259.90, 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80', 18),
    ('Panela de Fundo Triplo 24cm',  'Distribuição uniforme de calor, tampa de vidro e cabo que não esquenta.', 299.90, 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=800&q=80', 15),
    ('Balança Digital de Cozinha',   'Precisão de 1g até 5kg, função tara. Obrigatória pra confeitaria e panificação.', 89.90, 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=80', 60),
    ('Termômetro Culinário Digital', 'Leitura em 3 segundos, sonda dobrável. O fim do ponto no chute.', 119.90, 'https://images.unsplash.com/photo-1607116667981-ff148a14e975?w=800&q=80', 45),
    ('Cesto de Fermentação (Banneton)', 'Rattan natural 22cm com pano de linho. Dá a forma e o desenho do pão de fermentação natural.', 139.90, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80', 30),
    ('Kit Espátulas de Silicone',    'Três tamanhos, resistentes a 250°C, peça única sem emenda pra não acumular sujeira.', 74.90, 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800&q=80', 55),
    ('Máquina de Massa Manual',      'Cilindro em aço com nove espessuras e cortador pra tagliatelle e fettuccine.', 349.90, 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&q=80', 12),
    ('Coqueteleira Boston + Kit',    'Coqueteleira em aço, dosador, mexedor e coador. Tudo pra montar a bancada em casa.', 219.90, 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=800&q=80', 28),
    ('Pedra de Afiar Dupla Face',    'Grão 1000 e 3000 com base antiderrapante. Faca afiada corta menos dedo que faca cega.', 159.90, 'https://images.unsplash.com/photo-1481931098730-318b6f776db0?w=800&q=80', 35),
    ('Avental de Lona Chefio',       'Lona encerada, alça cruzada nas costas e dois bolsos. Aguenta cozinha profissional.', 149.90, 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80', 50)
  ) as p(name, description, price, image_url, stock)
  where not exists (
    select 1 from public.products x where x.name = p.name
  );

  get diagnostics v_produtos = row_count;

  raise notice 'Pronto: % cursos, % aulas, % produtos novos.', v_cursos, v_aulas, v_produtos;
end $$;

-- ============================================================
-- Conferindo
-- ============================================================
-- select title, category, price, status from public.courses order by created_at desc;
-- select c.title, count(l.id) as aulas from public.courses c
--   left join public.lessons l on l.course_id = c.id group by c.title order by c.title;
-- select name, price, stock from public.products order by name;

-- ============================================================
-- Desfazendo (apaga só o conteúdo deste seed)
-- ============================================================
-- delete from public.courses where slug in (
--   'fundamentos-da-cozinha','pao-de-fermentacao-natural','confeitaria-francesa-do-zero',
--   'cozinha-do-mediterraneo','cozinha-vegetal-sem-substituto','churrasco-e-cortes',
--   'peixes-e-frutos-do-mar','massas-frescas-artesanais','coquetelaria-classica',
--   'comida-de-verdade-no-dia-a-dia'
-- );
-- delete from public.products where name in (
--   'Faca do Chef 20cm','Tábua de Corte em Madeira','Frigideira de Ferro 26cm',
--   'Panela de Fundo Triplo 24cm','Balança Digital de Cozinha','Termômetro Culinário Digital',
--   'Cesto de Fermentação (Banneton)','Kit Espátulas de Silicone','Máquina de Massa Manual',
--   'Coqueteleira Boston + Kit','Pedra de Afiar Dupla Face','Avental de Lona Chefio'
-- );

-- Se alguma imagem do Unsplash sair do ar, isso devolve o padrão de azulejo:
-- update public.courses set thumbnail_url = null where thumbnail_url like 'https://images.unsplash.com/%';
