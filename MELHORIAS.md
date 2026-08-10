# Melhorias — Chefio

Backlog de dívida técnica. Revisão inicial em 05/08/2026, reavaliação completa em 06/08/2026, **terceira revisão completa em 10/08/2026**. Marque o checkbox ao resolver.

**Contexto que amarra a maior parte da lista:** o app não usa Server Actions — toda mutação vai do browser direto pro Supabase. Isso faz do RLS a única camada de autorização, então cada furo de policy é explorável do console do navegador.

**Estado geral (10/08/2026):** `npm run build` e `npx tsc --noEmit` passam. A revisão de 10/08 rodou com o banco de verdade na mão (queries read-only contra o projeto Supabase real, não só leitura de código) e isso mudou o diagnóstico: **três caminhos que as revisões anteriores davam como prontos estavam quebrados em produção** — matrícula em curso, venda na loja e login no deploy. Os dois primeiros só apareciam com uma requisição de verdade, porque o erro era engolido por `const { data } = await ...` sem checar `error`.

> ⚠️ **O banco está atrás do repositório. Verificado em 10/08/2026 contra o projeto real:**
>
> | Migration | Estado |
> |---|---|
> | 00001, 00002, 00003, 00005 | ✅ aplicadas (confirmado) |
> | 00004, 00006, 00007 | ❓ não verificável pela API REST |
> | **00008 (buckets)** | ❌ **zero buckets existem no projeto** |
> | **00009 (`create_product_order`)** | ❌ **função não existe** |
> | **00010 (agregações)** | ❌ **as 4 funções não existem** |
> | **00011 (role no insert + estoque)** | ❌ **nunca aplicada** (criada em 10/08) |
>
> **Consequência das que faltam, em produção agora:**
> - sem a 00009, o webhook do Stripe chama uma RPC inexistente → **o aluno paga o produto e o pedido nunca é criado**, com o Stripe retentando o webhook por dias;
> - sem a 00010, `/admin`, `/admin/financeiro` e `/professor/faturamento` recebem `null` e **mostram tudo zerado sem erro na tela**;
> - sem os buckets, `supabase.storage.from('thumbnails').upload(...)` falha → **criar curso com capa dá erro**.
>
> **Como corrigir:** rodar `00001` → `00011` **em ordem** no SQL Editor. As 11 são idempotentes (`create ... if not exists`, `create or replace`, `drop policy if exists` antes de cada create), então re-rodar tudo converge pro estado correto sem zerar o banco. A ordem é obrigatória: a 00002 cria `enrollments_student_insert` e `orders_student_insert`, que a 00003 e a 00007 derrubam — rodar avulso reabre furo de segurança. Depois criar os 4 buckets à mão (`thumbnails`/`avatars` públicos, `documents`/`attachments` privados) e rodar `supabase/VERIFICAR_ESTADO.sql`.
>
> **Por que ninguém percebeu:** as RPCs ausentes falham em silêncio, pelo mesmo motivo citado abaixo — `const { data } = await supabase.rpc(...)` sem checar `error` transforma "função não existe" em "zero". É o mesmo padrão que escondeu o checkout quebrado.

> 🚨 **`00012_rpc_grants_and_null_role_guard.sql` — aplicar com prioridade máxima.** Dois furos críticos achados ao verificar o estado do banco (não na leitura do código: só aparecem perguntando ao Postgres **quem pode chamar o quê**).
>
> 1. **`anon` podia executar `create_product_order`.** A função é `security definer` (ignora RLS), insere em `orders` com `status='paid'` e recebe `p_student_id` como **parâmetro**, não de `auth.uid()`. Com a chave anônima — que vive no bundle do browser, é pública por design — qualquer pessoa fabricava pedido pago sem pagar e zerava o estoque. Causa: a 00009 cria a função e nunca mexe em permissão, e o padrão do Postgres é conceder `EXECUTE` a `PUBLIC` na criação, do qual `anon` herda.
> 2. **O guard de admin da 00010 falhava aberto para quem não tem sessão.** `if (select get_my_role()) <> 'admin' then raise exception` — para anônimo, `auth.uid()` é NULL, `get_my_role()` devolve NULL, e `NULL <> 'admin'` é **NULL**, não `true`. O PL/pgSQL trata NULL como falso, não entra no `if` e **retorna os dados**. Qualquer visitante lia receita total, faturamento mensal e contagem de alunos/professores. Funcionava corretamente para aluno e professor logados, o que fazia o buraco sumir em qualquer teste com sessão aberta. Corrigido com `is distinct from`.
>
> A mesma armadilha de NULL existe em `guard_profile_role_change` (00007) — hoje não é explorável, porque chegar ao trigger exige passar pela policy `profiles_self_update`, que garante `auth.uid()` não-nulo. Corrigida junto, para a segurança da linha não depender de outra camada continuar verdadeira.
>
> **Lição:** revisão de RLS lê policies; permissão de `EXECUTE` em função é uma camada separada, que nenhuma das três revisões anteriores checou. `supabase/VERIFICAR_ESTADO.sql` seção 9 agora cobre.
>
> **Enquanto a causa-raiz não for fechada (ver ⚪ Qualidade), toda migration que criar função em `public` precisa terminar com `GRANT`/`REVOKE` explícito.** A 00012 é o modelo. Sem isso a função nasce chamável por `anon`, porque esse é o padrão do Postgres — não é preciso errar nada para abrir.

> ✅ **`rls_auto_enable` — investigada e aprovada (10/08/2026).** Chegou a ser tratada como suspeita: está em `public`, é `SECURITY DEFINER`, `anon` tem `EXECUTE` e não vem de nenhum arquivo do repo. A leitura do fonte desarmou o alarme — ela `RETURNS event_trigger`, e função com esse tipo de retorno **não é invocável diretamente**: só o gerenciador de event triggers do Postgres a chama, ao processar um `CREATE TABLE`. O `EXECUTE` de `anon` é o grant padrão a `PUBLIC` e é inalcançável na prática. Tem `search_path` fixo (`pg_catalog`) e o que faz é **habilitar RLS automaticamente em toda tabela nova de `public`** — rede de segurança, não furo. **Manter.**
>
> **Lição:** checar `prorettype` antes de classificar risco. `event_trigger` e `trigger` nunca são chamáveis por cliente, então `SECURITY DEFINER` + grant a `anon` nesses casos é ruído. A seção 8 do `VERIFICAR_ESTADO.sql` passou a fazer essa distinção sozinha, para não gerar o mesmo alarme falso de novo.

**Lição que vale registrar:** o padrão `const { data: x } = await supabase...` sem ler `error` aparece em praticamente todas as páginas. Foi ele que escondeu o PGRST200 do checkout por dias — a tela mostrava "curso indisponível", que parecia regra de negócio. Não é um item da lista, é a causa-raiz de vários.

---

## 🔴 Quebrado — impede o fluxo de ponta a ponta

Os 6 itens da revisão de 06/08 foram corrigidos naquele dia. Os 6 achados novos de 10/08 foram corrigidos em 10/08 — ver `## ✅ Resolvido (10/08/2026)`.

---

## 🟠 Correção de dados

Abertos após a revisão de 10/08:

- [ ] **Estoque não é reservado na criação da sessão do Stripe** — `app/api/stripe/checkout-products/route.ts:38`. A checagem acontece quando o carrinho vira sessão; entre isso e o webhook o aluno pode ficar minutos no formulário de pagamento, e outro pedido zera o saldo no meio. A 00011 parou de mascarar (estoque vai a negativo em vez de parar em zero), mas fechar de verdade exige reservar na criação e liberar no `checkout.session.expired`. Mudança de arquitetura, deixada de fora de propósito.

- [ ] **Receita da plataforma ignora a loja** — `app/(admin)/admin/financeiro/page.tsx:33`. `platformRevenue = totalGross - totalPayouts` sai de `enrollments` e `teacher_payouts`; nenhum valor de `orders` entra na conta. Com a loja destravada (ver 10/08), o número passa a estar errado de verdade, não só teoricamente.

- [ ] **"Total de alunos" conta matrículas, não alunos** — `app/(professor)/professor/page.tsx:72`. Um aluno em 2 cursos do mesmo professor conta 2. O rótulo promete pessoas; a query entrega linhas de `enrollments`.

---

## 🟡 Performance

Os 4 itens de 06/08 foram resolvidos naquele dia. Abertos após 10/08:

- [ ] **`revalidate = 300` em `/cursos` não tem efeito** — `app/(public)/cursos/page.tsx:11`. `searchParams` é Dynamic API no Next 14: a rota é `ƒ` no build e o `revalidate` é letra morta. Ou some com a diretiva (honesto) ou troca a busca GET nativa por filtro client-side (troca de arquitetura já recusada em 06/08, ver nota lá).

- [ ] **Sidebar faz um `select name` por navegação** — `AdminSidebar`/`AlunoSidebar`/`ProfessorSidebar`. A validação de sessão já é deduplicada por `getAuthedUser()`, mas o nome ainda custa um round-trip por página. Cabe em `user_metadata` no signup.

- [ ] **`/admin/pedidos` e `/admin/professores` sem paginação** — `.limit(100)` e sem limite nenhum, respectivamente, enquanto as outras 5 telas de admin já usam `<Pagination>`.

---

## 🔵 Código morto e não utilizado

Os itens de 06/08 e os 4 achados de 10/08 foram resolvidos. Ressalva histórica: o item sobre `globals.d.ts` (06/08) estava **errado** — não era código morto, ver nota na entrada correspondente. Restam:

- [ ] **`Button.loading` / `loadingText` nasceram sem adoção** — `components/ui/button.tsx:37-40`, adicionados em 07/08. Nenhum call site usa: todos continuam com `disabled={loading}` + ternário manual no texto. Ou migra os ~12 botões, ou remove a API.

- [ ] **`rejection_reason` nunca é escrito nem lido** — coluna existe em `courses` desde a 00001; `components/admin/CourseReviewActions.tsx` rejeita sem coletar motivo e `app/(professor)/professor/cursos/[id]/page.tsx:65` promete "corrija os problemas indicados pelo admin". A tela mente hoje.

- [ ] **`/professor/documentos` não existe** — a tabela `documents`, as policies (00002) e o bucket (00008) estão prontos, a página nunca foi feita. O link foi tirado do sidebar em 10/08 pra parar de dar 404; a decisão de construir ou remover o resto continua aberta.

---

## ⚪ Qualidade e manutenção

`@types/react`/`@types/react-dom` alinhados em `^18` (resolvido em 06/08/2026, ver `## ✅ Resolvido`). Restante:

- [ ] **`error` ignorado em quase toda query** — a causa-raiz citada no topo. `const { data: x } = await supabase...` sem checar `error` transforma falha de schema/rede/RLS em "não encontrado". Foi assim que o checkout ficou quebrado sem ninguém ver. Candidato a um helper que force a leitura do erro. **É pré-requisito do item abaixo.**

- [ ] **Função nova em `public` nasce aberta a `anon`** — causa-raiz dos dois furos que a 00012 corrigiu um a um: no Postgres, `CREATE FUNCTION` concede `EXECUTE` a `PUBLIC`, e no Supabase `anon`/`authenticated` herdam. Não é preciso errar nada para expor — expor é o padrão. O fecho é uma linha:

  ```sql
  alter default privileges in schema public revoke execute on functions from public;
  alter default privileges in schema public revoke execute on functions from anon;
  ```

  Chegou a existir como `00013_default_privileges_hardening.sql` e foi **removida sem ser aplicada em 10/08/2026**, por decisão consciente: esquecer o `GRANT` numa migration futura passa a dar `permission denied`, e enquanto o `error` for descartado em toda query isso reapareceria como tela zerada em silêncio — exatamente o sintoma que a 00010 ausente produziu. Retomar **depois** do item acima. Até lá, o controle é manual: toda migration que criar função termina com `GRANT`/`REVOKE` explícito, como a 00012.

- [ ] **CSRF no formulário de checkout** — `components/curso/PurchaseBox.tsx:82` posta um `<form>` real pra `/api/stripe/checkout`. Route handlers não têm a proteção que Server Actions têm de graça; um site externo consegue disparar matrícula em curso grátis no nome de quem estiver logado. Baixo impacto hoje (só cursos grátis mudam estado sem passar pelo Stripe), mas é dívida real.

- [ ] **`/aluno` e `/aluno/cursos` são quase o mesmo arquivo** — ~100 linhas duplicadas entre `app/(aluno)/aluno/page.tsx` e `app/(aluno)/aluno/cursos/page.tsx`: mesma query, mesmo grid, mesmo banner de professor pendente. Só o título e o subtítulo mudam.

- [ ] **Admin não edita nem desativa produto** — `ProductForm` só insere. Corrigir preço, estoque ou `is_active` exige ir no painel do Supabase. (O campo de estoque foi adicionado em 10/08 — antes nem criar produto vendável dava.)

- [ ] **`BUNNY_WEBHOOK_SECRET` falta no `.env.local`** — está no `.env.example`, mas não no ambiente local. Sem ela `isAuthorized()` devolve `false` sempre (`app/api/bunny/webhook/route.ts:7`), o webhook responde 401 e `bunny_video_url`/`duration_seconds` nunca são preenchidos depois do encode.

- [ ] **Números fictícios na home** — `app/(public)/page.tsx:24-28`: "500+ aulas, 50+ chefs, 10k+ alunos formados" numa plataforma com 1 curso e 1 usuário. Decisão de produto, não bug — mas é risco de credibilidade no lançamento.

- [ ] **Deletar aula não remove o vídeo no Bunny** — `components/courses/LessonList.tsx:139` apaga a linha e deixa o arquivo lá, cobrando storage pra sempre.

- [ ] **Sem lint** — `package.json` tem só `dev`/`build`/`start`, sem `eslint-config-next` instalado. O commit `f326195 "melhorias finais de lint"` não deixou configuração nenhuma no repo.

- [ ] **Sem teste** — num app que move dinheiro, o cálculo de comissão (`webhook/route.ts:78`) e a idempotência dos webhooks são os candidatos óbvios a teste unitário.

- [ ] **`as any` mascarando joins** — `app/api/bunny/signed-url/route.ts:24`, `app/api/bunny/upload-url/route.ts:21`, `app/(aluno)/aluno/cursos/[slug]/aulas/[lessonId]/page.tsx:82`, `app/(public)/page.tsx:29`. 22 ocorrências no total; `types/database.ts` está sendo desperdiçado. (O `as any` do `checkout/route.ts` saiu em 10/08 junto com o fix do embed.)

- [ ] **`try/catch` engolindo erro** — `app/(public)/page.tsx:39` e `app/(public)/cursos/page.tsx:40` escondem falha real de rede: a home mostra "nenhum curso" e ninguém fica sabendo.

- [ ] **Comissão ainda hardcoded em `?? 20` em 4 arquivos** — a coluna `commission_rate` é a fonte única de verdade, mas o fallback se repete em vez de vir de um só lugar. (A variável `PLATFORM_COMMISSION_RATE`, que não era lida em canto nenhum, saiu do `.env.example` na limpeza de 06/08/2026 — essa parte já não é mais duplicação.)

- [ ] **Sem lint** — `package.json` tem só `dev`/`build`/`start`, sem `eslint-config-next` instalado. O commit `f326195 "melhorias finais de lint"` não deixou configuração nenhuma no repo.

- [ ] **Sem teste** — num app que move dinheiro, o cálculo de comissão (`webhook/route.ts:78`) e a idempotência dos webhooks são os candidatos óbvios a teste unitário.

- [ ] **`as any` mascarando joins** — `app/api/stripe/checkout/route.ts:50`, `app/api/bunny/signed-url/route.ts:24`, `app/api/bunny/upload-url/route.ts:21`, `app/(aluno)/aluno/cursos/[slug]/aulas/[lessonId]/page.tsx:82`, `app/(public)/page.tsx:29`. 19 ocorrências no total; `types/database.ts` (253 linhas) está sendo desperdiçado.

- [ ] **`try/catch` engolindo erro** — `app/(public)/page.tsx:39` e `app/(public)/cursos/page.tsx:40` escondem falha real de rede: a home mostra "nenhum curso" e ninguém fica sabendo.

- [ ] **Comissão ainda hardcoded em `?? 20` em 4 arquivos** — a coluna `commission_rate` é a fonte única de verdade, mas o fallback se repete em vez de vir de um só lugar. (A variável `PLATFORM_COMMISSION_RATE`, que não era lida em canto nenhum, saiu do `.env.example` na limpeza de 06/08/2026 — essa parte já não é mais duplicação.)

- [ ] **Sem `error.tsx` por rota** — só o global em `app/error.tsx`. Uma query que falha em `/aluno/...` derruba a tela toda em vez de degradar a seção.

---

## Ordem sugerida

1. **Aplicar a migration 00011** — nada mais importa enquanto o professor cair em `/aluno` e o estoque parar em zero.
2. **Conferir o deploy** — as duas `NEXT_PUBLIC_*` no ambiente de build **com rebuild depois**, `NEXT_PUBLIC_APP_URL` no domínio real, e o domínio em Site URL + Redirect URLs no Supabase Auth. O `client.ts` agora falha com mensagem nomeando a variável em vez de morrer calado.
3. **Testar o fluxo de dinheiro de ponta a ponta** com Stripe em modo teste: comprar curso pago, comprar curso grátis, comprar produto. Os três nunca foram exercitados contra o banco real — foi exatamente por isso que dois estavam quebrados.
4. 🟠 Correção de dados: reserva de estoque, receita da plataforma ignorando a loja.
5. ⚪ Qualidade: o helper que force a leitura de `error`, lint, testes.

---

## ✅ Resolvido (10/08/2026)

Revisão completa dos 125 arquivos de código + as 10 migrations, com verificação read-only contra o banco Supabase real. `tsc --noEmit` e `npm run build` limpos depois de tudo.

### 🔴 Quebrado

- [x] **Nenhuma matrícula funcionava — nem paga, nem grátis** — `app/api/stripe/checkout/route.ts`. A query fazia `teacher_profiles!inner(...)` a partir de `courses`, mas **não existe FK entre as duas tabelas** (ambas apontam pra `profiles`), então o PostgREST derrubava a request inteira. Confirmado ao vivo, não deduzido: `HTTP 400 PGRST200 "Could not find a relationship between 'courses' and 'teacher_profiles' in the schema cache"`. Como o `error` era descartado, `course` virava `null` e **todo clique em "Comprar curso" / "Inscrever-se grátis" caía em `/cursos?erro=curso_indisponivel`** — o que parecia regra de negócio. Bate com `enrollments` estar vazio no banco.
  Corrigido em duas queries: `courses` pela sessão do aluno e `teacher_profiles` por `teacher_id` com `createAdminClient()` — mesmo com a FK certa, a RLS de `teacher_profiles` não deixa o aluno ler a linha do professor, então um `!inner` sumiria com o curso do mesmo jeito. Verificado: as duas queries novas retornam 200 com dado real. De quebra, o insert de matrícula grátis passou a checar `error` (23505 = já matriculado, segue; resto vira `?erro=matricula_falhou`) e o `as any` do `teacher_profiles` saiu.
- [x] **A loja não conseguia vender nada** — `components/admin/ProductForm.tsx`. `products.stock` tem `default 0` e **nada no projeto escrevia essa coluna** — o formulário do admin só gravava nome, descrição e preço. Aí `checkout-products/route.ts:38` reprovava com "Estoque insuficiente" em 100% dos produtos. Campo de estoque adicionado (com aviso de que 0 bloqueia a compra), mais campo de URL de imagem — `image_url` também nunca era preenchido, então todo produto ficava no ícone placeholder. `/admin/produtos` passou a mostrar o saldo na lista, em vermelho quando zerado.
- [x] **Login quebrado no deploy** — `lib/supabase/client.ts`. `NEXT_PUBLIC_*` é inlinado em **build time**: sem as variáveis no ambiente de build, o client do browser recebia `undefined` e o `createBrowserClient` estourava no submit do login — enquanto o site continuava abrindo, porque `server.ts`/`public.ts` caem num placeholder (`a1fd022`) e o middleware passa direto quando falta env. Diagnóstico foi por eliminação: o banco estava saudável (usuário confirmado, `app_metadata.role` populado, trigger da 00005 funcionando), então sobrava a config. O client passou a falhar com uma mensagem que nomeia as duas variáveis e avisa que mudar sem rebuildar não adianta. **Os fallbacks de `server.ts`/`public.ts` foram mantidos de propósito** — eles é que permitem o prerender estático de `/` e `/para-chefs` num build sem backend.
- [x] **Middleware descartava os cookies de sessão renovados** — `middleware.ts`. `updateSession()` renova o access token e grava os cookies novos em `supabaseResponse`; os três `NextResponse.redirect()` criavam resposta nova e jogavam essa renovação fora. Resultado: token expirado nunca era substituído, `getUser()` devolvia null de novo e a pessoa ficava em loop entre a rota protegida e o `/login` — só em produção, porque em dev a sessão raramente expira no meio do teste. Helper `redirectPreservandoSessao()` copia os cookies pra resposta de redirect. Corrigido junto: autenticado **sem** claim de role ia pra `/login`, e a regra de baixo só desvia de `/login` quem *tem* role — outro loop; agora vai pra `/`.
- [x] **Professor aprovado continuava aluno** — `supabase/migrations/00011_role_sync_on_insert_and_stock.sql`. `sync_role_with_teacher_status` (00003) é `after update` apenas: uma linha de `teacher_profiles` criada já com `status='active'` (seed, painel, importação) nunca promovia `profiles.role`. **O banco atual está exatamente nesse estado** — `teacher_profiles.status='active'` com `profiles.role='student'` pro mesmo usuário, ou seja, um "professor" que loga e cai em `/aluno`. Trigger passou a ser `after insert or update`, com `tg_op` explícito (`old` é NULL em INSERT), mais backfill pra corrigir quem já está inconsistente. Ganhou `set search_path = public`, que faltava numa função `security definer`.
- [x] **VideoUploader sumia na hora de usar** — `components/courses/LessonForm.tsx`, `components/courses/LessonList.tsx`. Ao criar aula, `onSaved(created)` disparava `handleFormClose()` no pai, que desmontava o formulário — junto com o `savedLessonId` e o `<VideoUploader>` que só aparece quando existe lessonId. O toast dizia "Aula criada! Agora faça o upload do vídeo" e o campo de upload desaparecia junto. `onSaved` ganhou um segundo argumento `manterAberto`: editar fecha, criar mantém aberto e passa pro modo de edição (senão um segundo submit criaria outra aula em vez de atualizar a recém-criada).

### 🟠 Correção de dados

- [x] **`greatest(0, ...)` escondia venda acima do estoque** — `00011`. `create_product_order` (00009) parava o saldo em zero: o pedido era criado, o dinheiro entrava e a informação de que faltavam unidades sumia. Agora o estoque vai a negativo — backorder visível pro admin. **Não** foi transformado em exceção de propósito: o pagamento já aconteceu quando o webhook roda, então abortar deixaria o aluno pago e sem pedido, com o Stripe retentando por dias.
- [x] **Carrinho grande estourava o metadata do Stripe** — `app/api/stripe/checkout-products/route.ts`. `itemsSummary` empacota `"<uuid>:<qtd>,"` (~40 chars cada) num campo com teto de 500: a partir de ~12 produtos distintos a criação da sessão falhava com 500 genérico na hora de pagar. Agora valida o tamanho e devolve mensagem explicando o limite.
- [x] **Quantidades duplicadas não somavam antes da checagem de estoque** — mesmo arquivo. O mesmo produto em duas linhas do carrinho passava duas vezes na validação individual, e o total pedido podia superar o saldo (2 linhas de 3 com 4 em estoque). Agora agrega por `product_id` antes de validar. O `req.json()` também ganhou try/catch — body malformado virava 500 não tratado.
- [x] **Slug de curso colidia entre professores** — `components/courses/CourseForm.tsx`. O código contava slugs parecidos com um `SELECT ... like`, mas a RLS só deixa o professor ver os próprios cursos (mais os aprovados): um rascunho de outro professor com o mesmo título era invisível e o insert batia no unique constraint com toast genérico. A contagem também errava sozinha (`bolo` + `bolo-3` → gera `bolo-3`). Trocado por tentar inserir e tratar o `23505` com sufixo aleatório, até 5 tentativas — é o único caminho que enxerga a tabela inteira.
- [x] **`Notebook` dizia "Salvo" mesmo falhando** — `components/player/Notebook.tsx`. O `upsert` não checava `error` e a UI carimbava "Salvo às HH:MM" de qualquer jeito; anotação perdida em silêncio. Agora mostra "Não foi possível salvar — não feche a página" em vermelho. (Item que estava aberto em ⚪ desde 06/08.)
- [x] **`key` duplicada em repasses** — `app/(admin)/admin/financeiro/page.tsx`. `key={p.created_at}` colide entre dois payouts criados no mesmo instante (o webhook insere em lote); `id` nem estava no `select`. Passou a selecionar e usar `p.id`.

### 🔵 Código morto

- [x] **13 tokens de cor legados no `globals.css`** — `--color-primary`, `--color-secondary`, `--color-background`, `--color-muted`, `--color-border`, `--color-card`, `--color-destructive` e variantes. A migração pro Azulejo (07/08) zerou o uso de todos; confirmado por grep classe a classe (`bg-primary`, `text-muted-foreground`, …) antes de apagar. Cada um gerava utilitários no bundle que ninguém referenciava.
- [x] **Tipos compostos órfãos** — `CourseWithTeacher`, `LessonWithProducts` e `EnrollmentWithCourse` removidos de `types/database.ts`: zero importações, e o primeiro descrevia um join (`teacher.teacher_profile`) que o PostgREST nem resolve — é a mesma FK inexistente que quebrava o checkout.
- [x] **`Button.asChild`** — declarado na interface, nunca implementado (não há Slot no projeto) e nem desestruturado, então cairia no `{...props}` e viraria `aschild` no DOM com warning do React. Removido.
- [x] **Link morto pra `/professor/documentos`** — `components/layout/ProfessorSidebar.tsx`. A rota nunca existiu; o item dava 404. Removido com nota apontando que a tabela, a RLS e o bucket já estão prontos pra quando a página existir.

### ⚪ Qualidade

- [x] **Tiptap sem `immediatelyRender: false`** — `components/player/Notebook.tsx`. A v3 aborta com "SSR has been detected" quando o editor é montado na primeira renderização de uma página server-rendered.
- [x] **`next` sem validação no callback de auth** — `app/api/auth/callback/route.ts`. `${origin}${next}` com um `next=https://exemplo.com` monta URL inválida e o redirect estoura 500. Aplicada a mesma regra que `app/(public)/login/page.tsx:15` já usava. Também protegido o caso de `DASHBOARD_BY_ROLE[role]` indefinido, que virava `${origin}undefined`.
- [x] **`.single()` onde zero linha é o normal** — 15 chamadas convertidas pra `.maybeSingle()` (notebooks, lesson_progress, enrollments, teacher_profiles, profiles nos 3 sidebars). Cada uma gerava um erro PGRST116 descartado — barulho que escondia erro de verdade. As que sobraram são as que de fato esperam a linha e tratam o null logo depois com `notFound()`.
- [x] **Botão "Dashboard Stripe" levava a lugar nenhum** — `app/api/stripe/connect/dashboard/route.ts` (novo), `app/(professor)/professor/faturamento/page.tsx`. O link apontava pro `dashboard.stripe.com` fixo, que conta **Express** não consegue acessar — o professor caía numa tela de login intransponível. Agora gera um login link de uso único via `stripe.accounts.createLoginLink()`, com erros nomeados na querystring (`conta_nao_conectada`, `onboarding_incompleto`) exibidos na página.

---

## ✅ Resolvido (06/08/2026)

- [x] **Upload de vídeo não funcionava** — `app/api/bunny/upload-url/route.ts`, `components/courses/VideoUploader.tsx`. Rota passou a devolver credenciais TUS assinadas (`sha256(libraryId + apiKey + expiration + videoId)`, a `apiKey` nunca sai do servidor); o componente usa `tus-js-client` (`Upload`) pro envio resumível em vez do `PUT` cru que faltava `AccessKey`.
- [x] **Onboarding do professor era inalcançável** — `app/(aluno)/aluno/page.tsx`. Quem pediu pra ser professor e está com `teacher_profiles.status = 'pending'` (role ainda `student`) vê um aviso no dashboard do aluno em vez de esbarrar num redirect silencioso pro `/professor/onboarding` que o middleware nunca deixaria abrir.
- [x] **`connect/return` escrevia numa coluna que o trigger da 00007 bloqueia** — `app/api/stripe/connect/return/route.ts`. `update({ status: 'active' })` passou a usar `createAdminClient()`; é uma escrita de sistema (após validar `charges_enabled` no Stripe), não do usuário.
- [x] **`refresh_url` do Stripe apontava pra rota POST-only** — `app/api/stripe/connect/onboarding/route.ts`. Agora aponta pra `/professor/onboarding` (a página). Aproveitado pra trocar a checagem de role por `roleFromUser(user)` (JWT) em vez de `select` em `profiles`.
- [x] **Erro de checkout de curso vazava JSON cru na tela** — `app/api/stripe/checkout/route.ts`, `app/(public)/curso/[slug]/page.tsx`, `app/(public)/cursos/page.tsx`. Os três `NextResponse.json({error})` viraram `redirect` com `?erro=`; as duas páginas leem a query e mostram um banner.
- [x] **Carrinho nunca era limpo depois de pagar** — `components/store/ClearCartOnSuccess.tsx` (novo), montado em `/aluno/pedidos` quando a URL chega com `?success=true`. Limpa e tira a query da URL (`router.replace`), pra um refresh ou link salvo não apagar um carrinho novo.
- [x] **Baixa de estoque não era atômica** — `supabase/migrations/00009_atomic_product_order.sql`, `app/api/stripe/webhook/route.ts`. RPC `create_product_order` cria `orders` + `order_items` e debita `products.stock` numa transação só, com `select ... for update` travando a linha do produto (preço e estoque lidos consistentes, sem lost update entre webhooks concorrentes). Idempotência por `stripe_payment_intent_id` migrou pra dentro da função (incluindo o caso de corrida entre dois webhooks quase simultâneos, via `exception when unique_violation`).
- [x] **Duas migrations `00003`** — `00003_storage_buckets.sql` renomeada pra `00008_storage_buckets.sql` (conteúdo idêntico). `SUPABASE_MIGRATION_GUIDE.md` parou de listar a ordem em prosa e passou a apontar pra pasta, que agora tem numeração única.
- [x] **`orders.status` tinha estados inalcançáveis** — `app/(admin)/admin/pedidos/page.tsx` (novo), `components/admin/OrderStatusActions.tsx` (novo), `components/layout/AdminSidebar.tsx`. Tela de pedidos no admin, com ação pra avançar `paid → shipped → delivered` (RLS já cobria via `orders_admin_all`, não precisou de migration nova).
- [x] **Navbar forçava `/`, `/cursos` e `/para-chefs` a renderizar dinâmicas** — `components/layout/NavbarAuth.tsx` (novo), `components/layout/Navbar.tsx`, `components/layout/MobileNav.tsx`. O estado de sessão saiu do server component (`getAuthedUser()` → `cookies()`) pra um client component que lê `getSession()` (só storage local, sem round-trip) e assina `onAuthStateChange`. Primeira renderização assume visitante — quem já está logado vê o link trocar pra "Minha área" assim que o efeito roda; sem isso, a única alternativa era um placeholder de tamanho adivinhado ou manter a rota inteira dinâmica.
  **Resultado real, não o que o item antigo previa:** `/` e `/para-chefs` confirmados `○ Static` no build. **`/cursos` continua `ƒ Dynamic`** — não mais pela Navbar, mas por usar `searchParams` (os filtros de categoria/busca), que é uma Dynamic API própria do Next 14 independente de cookies. Virar estática exigiria trocar a busca de GET nativo (comentário no próprio arquivo: "busca sem client component nem JS", decisão deliberada) por filtro client-side — troca de arquitetura que não estava pedida aqui, deixada de fora de propósito.
- [x] **Dependências instaladas sem import** — `@stripe/stripe-js`, `date-fns` e `autoprefixer` removidas do `package.json` (Tailwind v4 já prefixa via `@tailwindcss/postcss`, não precisa do PostCSS plugin separado). `tus-js-client` deixou de estar nessa lista — passou a ser usado no fix do upload de vídeo.
- [x] **View `teacher_profiles_public` órfã** — em vez de remover, passou a ser usada de verdade: tipo adicionado em `types/database.ts` (`Views`, precisa do campo `Relationships: []` pra bater com o tipo `GenericView` do postgrest-js, senão o schema inteiro degrada pra `never`), e `app/(public)/curso/[slug]/page.tsx` volta a mostrar a bio do professor, que tinha sumido quando a policy pública foi trocada pela view na 00003.
- [x] **`components/ui/card.tsx`** — removido (`git rm`), zero consumidores confirmados antes de apagar.
- [x] **`formatDate` e o tipo `CourseCategory`** — removidos de `lib/utils.ts`.
- [x] **`globals.d.ts` — o item original estava errado.** Não é redundante: `next-env.d.ts` só referencia os tipos do Next, que declaram `*.module.css` (CSS Modules), não `*.css` puro. `app/layout.tsx` importa `./globals.css` como side-effect puro — sem o `declare module '*.css'` desse arquivo, `tsc --noEmit` quebra (`TS2882: Cannot find module or type declarations for side-effect import`), confirmado removendo o arquivo e rodando o typecheck antes de reverter. Mantido como está.
- [x] **`courseId` em `app/api/bunny/upload-url/route.ts`** — removido do body, do componente `VideoUploader` e da chamada em `LessonForm`. A validação de dono sempre foi por `lesson → course.teacher_id`; o parâmetro só forçava o caller a mandar um valor que nunca era conferido contra o real.
- [x] **Env vars não lidas** — `PLATFORM_COMMISSION_RATE` e `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` removidas do `.env.example`.
- [x] **Role/perfil lido do banco onde já tinha dado mais barato** — `components/auth/LoginForm.tsx`, `components/layout/AdminSidebar.tsx`, `components/layout/AlunoSidebar.tsx`, `components/layout/ProfessorSidebar.tsx`. `LoginForm` parou de fazer `getUser()` + `select role` depois do login — o próprio `signInWithPassword()` já devolve `data.user.app_metadata.role` (token novo, recém-emitido, reflete o role atual). Os três sidebars trocaram `createClient().auth.getUser()` por `getAuthedUser()` (o helper com `React.cache()` de `lib/auth/session.ts`), que dedupa com a chamada que o `requireRole()` do layout já fez no mesmo request — zero round trip extra de auth. O `select name` continua (nome não vive no JWT), só não duplica mais a validação da sessão. `app/api/stripe/connect/onboarding/route.ts:17` já tinha sido corrigido durante o item de onboarding do professor, mais cedo no mesmo dia.
- [x] **`@types/react` 19.2.14 com `react` 18.3.1** — alinhados em `@types/react@^18.3.31` e `@types/react-dom@^18.3.7`.
- [x] **`/curso/[slug]` não usava o client público** — `app/(public)/curso/[slug]/page.tsx`, `components/curso/PurchaseBox.tsx` (novo). `createClient()` (cookies) saiu por completo do server component e de `generateMetadata`, trocado por `createPublicClient()`. A única parte que precisa de sessão — "você já tem este curso" / CTA de compra / banner de erro do checkout — virou um client component isolado (`PurchaseBox`), que checa `getSession()` (storage local) e a matrícula via query direta do browser, envolvido em `<Suspense>` (exigência do `useSearchParams()` lá dentro). `export const revalidate = 300` adicionado.
  **Verificado, não assumido:** `tsc --noEmit` e `npm run build` limpos; confirmei por grep que não sobra nenhum `cookies()`/`headers()`/`searchParams`-como-prop na árvore server. **Uma ressalva honesta:** a rota continua aparecendo `ƒ Dynamic` no relatório do build — testei isolando a variável (removi temporariamente o `useSearchParams()` do `PurchaseBox` e rebuildei) e o badge não mudou, confirmando que é só por ser um segmento `[slug]` sem `generateStaticParams` — o build nunca marca esse tipo de rota como `○` mesmo sendo elegível a ISR em runtime. Não consegui confirmar o cache real (`x-nextjs-cache: HIT`) porque este ambiente não tem um Supabase de verdade com curso cadastrado pra rodar `next start` contra dado real.
- [x] **Sem paginação em lugar nenhum** — `components/ui/pagination.tsx` (novo, estilo dashboard: `/admin/matriculas`, `/admin/produtos`, `/admin/cursos`, `/aluno/loja`); paginação própria em `/cursos` no estilo público (cobalto/cal), separada de propósito — mesmo motivo do `action-link.tsx` já não reusar `<Button>` nas páginas públicas. Todos os 5 SELECTs agora usam `.range()` com `{ count: 'exact' }`, `?page=N` na querystring (GET nativo, sem client component). `/admin/cursos` combina `page` com o filtro `status` já existente. O card "X vendas/produtos/matrículas" de cada página passou a mostrar o `count` real (toda a tabela), não mais o tamanho do array carregado.
- [x] **Agregações em JS sobre a tabela inteira** — `supabase/migrations/00010_aggregation_rpcs.sql` (4 funções novas), `app/(admin)/admin/page.tsx`, `app/(admin)/admin/financeiro/page.tsx`, `app/(professor)/professor/faturamento/page.tsx`. `get_admin_dashboard_stats()` junta 5 round trips (4 counts + 1 sum de enrollments inteiro) num só. `get_admin_financial_totals()` e `get_admin_monthly_revenue()` tiram o reduce/group-by em JS do financeiro — e corrigem de quebra um bug: "total de repasses" somava só os últimos 20 (o `.limit(20)` da lista), não o total de verdade. `get_my_teacher_revenue_by_course()` agrupa por curso no banco pro faturamento do professor; roda como `security invoker` com `where c.teacher_id = (select auth.uid())` **dentro da query**, não como parâmetro vindo do client — se fosse parâmetro, a policy `courses_public_approved_read` deixaria ler o título de cursos de outros professores (com receita zerada, mas vazando o catálogo inteiro em vez de só os próprios). As 3 funções admin são `security definer` com guarda explícita (`get_my_role() <> 'admin' → raise exception`), porque bypassar RLS sem isso exporia receita da plataforma pra qualquer usuário autenticado.

---

## ✅ Resolvido (05/08/2026)

Histórico condensado — o racional detalhado de cada correção de banco está nos comentários das próprias migrations.

- [x] **Escalação de privilégio no cadastro** — `00003_security_fixes.sql`, `00007_close_self_update_holes.sql`. `handle_new_user()` força `role = 'student'`; a 00007 fechou a segunda porta (`profiles_self_update` / `teacher_profiles_self_update` sem restrição de coluna) com triggers que bloqueiam mudança de `role`, `status` e `commission_rate` pra quem não é admin.
- [x] **Preço do carrinho vinha do cliente** — `app/api/stripe/checkout-products/route.ts`. Preço, nome e estoque agora vêm sempre do banco.
- [x] **Matrícula grátis via RLS** — `00003`, `00007`, `app/api/stripe/checkout/route.ts`. Policies `enrollments_student_insert` e `orders_student_insert` removidas; só service role insere.
- [x] **Professor aprovava o próprio curso** — `00003`. Trigger `courses_guard_status_change` restringe a transição a `draft → pending_review` fora do admin.
- [x] **Webhook do Bunny sem autenticação** — `app/api/bunny/webhook/route.ts`. Exige `BUNNY_WEBHOOK_SECRET`, comparado com `timingSafeEqual`.
- [x] **`stripe_account_id` exposto publicamente** — `00003`. Policy pública removida. (Ver item aberto sobre a view órfã que a substituiu.)
- [x] **`createAdminClient()` misturava service role com cookies do usuário** — `lib/supabase/server.ts`. Reescrito sem cookie store.
- [x] **Pedidos de produto nunca eram registrados** — `app/api/stripe/webhook/route.ts`. Webhook ramifica por `session.metadata.type`.
- [x] **Webhook sem idempotência** — `00004_stripe_idempotency.sql`. Índices únicos parciais em `orders.stripe_payment_intent_id` e `teacher_payouts.stripe_transfer_id`.
- [x] **Assinatura da URL do Bunny inválida** — `app/api/bunny/signed-url/route.ts`. Hash simples `sha256(tokenAuthKey + videoId + expires)` + URL de embed. **Ainda não validado contra uma library real** com Token Authentication habilitado.
- [x] **`VideoPlayer` acumulava listeners** — `components/player/VideoPlayer.tsx`. Listener migrou pra `useEffect` com cleanup.
- [x] **`CartContext` gravava `[]` por cima do carrinho salvo** — `contexts/CartContext.tsx`. Estado `hydrated` antes de persistir.
- [x] **Middleware consultava `profiles` em toda navegação** — `00005_role_jwt_sync.sql`, `middleware.ts`, `lib/auth/session.ts`. Role vive em `app_metadata` do JWT. **Sessões ativas só recebem o claim novo no próximo refresh de token.**
- [x] **Waterfall de queries sequenciais** — player de aula (7 → 2 round-trips), curso do aluno (5 → 3), faturamento (4 → 2).
- [x] **RLS reavaliando `auth.uid()` por linha / índices faltando** — `00006_rls_performance.sql`. Policies envolvidas em subquery; índices em `orders(student_id)`, `order_items(order_id)`, `teacher_payouts(teacher_id)`, `documents(teacher_id)`.
- [x] **Menu hambúrguer invisível no mobile** — `components/layout/MobileNav.tsx`. `createPortal` pro `body` (o `backdrop-blur` do header virava containing block), mais animação de entrada/saída com o token `--ease-azulejo`.
