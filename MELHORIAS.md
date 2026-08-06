# Melhorias — Chefio

Backlog de dívida técnica. Revisão inicial em 05/08/2026, reavaliação completa do projeto em 06/08/2026. Marque o checkbox ao resolver.

**Contexto que amarra a maior parte da lista:** o app não usa Server Actions — toda mutação vai do browser direto pro Supabase. Isso faz do RLS a única camada de autorização, então cada furo de policy é explorável do console do navegador.

**Estado geral (06/08/2026):** `npm run build` e `npx tsc --noEmit` passam. A arquitetura está coerente — route groups por papel, RLS como fonte de verdade, dinheiro só via webhook com service role. O que sobra não é problema de estrutura: é um conjunto de features que estão quebradas na prática.

---

## 🔴 Quebrado — impede o fluxo de ponta a ponta

- [ ] **Upload de vídeo não funciona — a feature central do produto**
  `components/courses/VideoUploader.tsx:63-66` faz `PUT` direto pra `https://video.bunnycdn.com/library/{id}/videos/{guid}` **sem o header `AccessKey`**. Esse endpoint do Bunny exige a chave, então todo upload retorna 401. Mandar a API key pro browser não é opção (vazamento).
  **Fix:** upload via TUS com assinatura pré-computada no servidor — `sha256(libraryId + apiKey + expiration + videoId)`. O `tus-js-client` já está no `package.json` e nunca foi importado: o plano original era esse e ficou pela metade.

- [ ] **Onboarding do professor é inalcançável**
  Professor recém-cadastrado tem `role = 'student'` (correto, pela 00003), e `middleware.ts:45` barra `/professor/*` pra quem não é `teacher`. Ou seja: **ninguém com `status = 'pending'` consegue abrir `/professor/onboarding`**. O único caminho real de ativação é o admin em `/admin/professores`, o que inverte a intenção da tela (ela existe pra ser o portão *antes* de vender).
  **Fix:** decidir o fluxo — ou libera `/professor/onboarding` no middleware pra quem tem `teacher_profiles` pendente, ou move a tela pra dentro de `/aluno` enquanto não for aprovado.

- [ ] **`connect/return` escreve numa coluna que o trigger da 00007 bloqueia**
  `app/api/stripe/connect/return/route.ts:26-29` faz `update({ status: 'active' })` com o client da **sessão do usuário**. O trigger `guard_teacher_profile_admin_columns` (00007) levanta exceção nesse caso. O erro não é checado, então a rota redireciona pra `?success=true` com o status inalterado — falha silenciosa.
  Hoje não explode só porque o admin já ativou antes e o update vira no-op. O comentário da 00007 afirma que o grep confirmou que nenhum client escreve em `status`; esse arquivo passou despercebido.
  **Fix:** usar `createAdminClient()` na rota — ela é server-side e já valida `charges_enabled` contra o Stripe, então é uma escrita legítima de sistema, não de usuário.

- [ ] **`refresh_url` do Stripe aponta pra rota que só aceita POST**
  `app/api/stripe/connect/onboarding/route.ts:52` manda o Stripe redirecionar o browser (GET) pra `/api/stripe/connect/onboarding`, que só exporta `POST` → 405. Quem abandona o formulário do Stripe cai numa tela de erro.
  **Fix:** apontar `refresh_url` pra `/professor/onboarding` (a página), não pra rota de API.

- [ ] **Erro de checkout de curso vira JSON cru na tela**
  `app/(public)/curso/[slug]/page.tsx:152` usa `<form action="/api/stripe/checkout" method="POST">` — navegação de verdade. Qualquer `NextResponse.json({ error }, { status })` da rota é renderizado como texto puro no navegador.
  **Fix:** trocar os `json()` de erro por `NextResponse.redirect` com query de erro, como a rota já faz nos caminhos de sucesso.

- [ ] **Carrinho nunca é limpo depois de pagar**
  `clear()` só é chamado pelo botão "Limpar carrinho" em `components/store/CartDrawer.tsx`. Depois do checkout o usuário volta pra `/aluno/pedidos?success=true` com o carrinho cheio e pode comprar de novo sem perceber.
  **Fix:** limpar ao detectar `?success=true`, ou (melhor) antes de redirecionar pro Stripe, já que o carrinho é só localStorage.

---

## 🟠 Correção de dados

- [ ] **Baixa de estoque não é atômica**
  `app/api/stripe/webhook/route.ts:159-166` lê `stock`, calcula em JS e escreve. Dois webhooks concorrentes perdem uma baixa. E se o insert de `order_items` falhar, o pedido já foi criado e o estoque já foi debitado — sem rollback.
  **Fix:** RPC transacional que cria `orders` + `order_items` e faz `update products set stock = stock - $1` numa transação só.

- [ ] **Duas migrations com o mesmo número**
  `00003_security_fixes.sql` e `00003_storage_buckets.sql`. Não há `supabase/config.toml` — as migrations são coladas à mão no SQL Editor, então hoje "funciona", mas inviabiliza `supabase db push` e o `SUPABASE_MIGRATION_GUIDE.md:70` já precisa desambiguar a ordem em prosa.
  **Fix:** renomear `00003_storage_buckets.sql` → `00008_storage_buckets.sql` e atualizar o guia.

- [ ] **`orders.status` tem estados inalcançáveis**
  `shipped` e `delivered` são renderizados em `app/(aluno)/aluno/pedidos/page.tsx:40-41` e existem no CHECK constraint, mas nenhuma tela admin muda o status. O admin tem Produtos, mas não tem Pedidos.
  **Fix:** ou uma tela `/admin/pedidos` com transição de status, ou tirar os dois estados do constraint e da UI.

---

## 🟡 Performance

- [ ] **Páginas públicas continuam 100% dinâmicas**
  O build marca **todas** as rotas como `ƒ (Dynamic)`, incluindo `/`, `/cursos` e `/para-chefs`. `app/(public)/layout.tsx` renderiza `<Navbar>`, que é async e chama `getAuthedUser()` → `cookies()`, o que opta o segmento inteiro por dinâmico e anula o `createPublicClient()` criado justamente pra evitar isso. Os `export const revalidate = 300` em `page.tsx` e `cursos/page.tsx` não têm efeito nenhum hoje.
  (Limitação já registrada quando o `createPublicClient` foi introduzido — promovida a item próprio porque é o que trava o ganho.)
  **Fix:** tirar o estado de auth da Navbar server-side — checar sessão num client component, ou envolver a parte autenticada em `<Suspense>`, ou habilitar PPR.

- [ ] **`/curso/[slug]` não usa o client público**
  `app/(public)/curso/[slug]/page.tsx` usa `createClient()` (com cookies) mesmo sendo página de catálogo. Coerência com a estratégia acima: o conteúdo do curso é público, só o "você já tem este curso" precisa de sessão.

- [ ] **Agregações em JS sobre a tabela inteira**
  `app/(admin)/admin/page.tsx:19` puxa `amount_paid` de *todas* as matrículas pra somar em memória; mesmo padrão em `admin/financeiro` e `professor/faturamento`. Ok com 50 linhas, derrete com 50 mil.
  **Fix:** RPC com `sum()` / `group by` no Postgres.

- [ ] **Sem paginação em lugar nenhum**
  `/cursos`, `/aluno/loja`, `/admin/matriculas`, `/admin/produtos`, `/admin/cursos` — todos SELECT sem `limit` / `range`.

- [ ] **Role lido do banco onde o JWT já responde**
  `app/api/stripe/connect/onboarding/route.ts:17` e `components/auth/LoginForm.tsx:52` consultam `profiles` pra descobrir o role que já está em `user.app_metadata`. Os três sidebars (`AdminSidebar`, `AlunoSidebar`, `ProfessorSidebar`) fazem um `select name` cada um, depois de o `requireRole` já ter buscado o usuário.
  **Exceção legítima:** `app/api/auth/callback/route.ts:23` — o token emitido no signup pode preceder o trigger de sync. Falta um comentário explicando isso, senão alguém "otimiza" e quebra.

---

## 🔵 Código morto e não utilizado

- [ ] **Dependências instaladas sem nenhum import** — `tus-js-client` (era pra ser o upload do Bunny), `@stripe/stripe-js`, `date-fns`, `autoprefixer` (o PostCSS usa só `@tailwindcss/postcss`).

- [ ] **View `teacher_profiles_public` órfã** — criada na 00003 pra substituir a policy `teacher_profiles_public_read` que foi dropada. Nunca foi consultada, não tem tipo em `types/database.ts`, e a consequência é que **a bio do professor sumiu da página de curso** — `curso/[slug]` só mostra o nome, vindo de `profiles`. Ou usa a view, ou remove.

- [ ] **`components/ui/card.tsx`** — nunca importado.

- [ ] **`formatDate` e o tipo `CourseCategory`** em `lib/utils.ts` — sem uso.

- [ ] **`globals.d.ts`** — `declare module '*.css'` já é coberto pelo `next-env.d.ts` do Next.

- [ ] **`courseId` em `app/api/bunny/upload-url/route.ts`** — recebido no body e nunca usado; a validação de dono vai por `lesson → course.teacher_id`.

- [ ] **Env vars declaradas e não lidas** — `PLATFORM_COMMISSION_RATE` e `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` no `.env.example`.

---

## ⚪ Qualidade e manutenção

- [ ] **`@types/react` 19.2.14 com `react` 18.3.1** — mismatch de major. Passa hoje por causa do `skipLibCheck`, mas os tipos descrevem uma API que não é a instalada. Alinhar em `^18`.

- [ ] **Sem lint** — `package.json` tem só `dev`/`build`/`start`, sem `eslint-config-next` instalado. O commit `f326195 "melhorias finais de lint"` não deixou configuração nenhuma no repo.

- [ ] **Sem teste** — num app que move dinheiro, o cálculo de comissão (`webhook/route.ts:78`) e a idempotência dos webhooks são os candidatos óbvios a teste unitário.

- [ ] **`as any` mascarando joins** — `app/api/stripe/checkout/route.ts:50`, `app/api/bunny/signed-url/route.ts:24`, `app/api/bunny/upload-url/route.ts:21`, `app/(aluno)/aluno/cursos/[slug]/aulas/[lessonId]/page.tsx:82`, `app/(public)/page.tsx:29`. 19 ocorrências no total; `types/database.ts` (253 linhas) está sendo desperdiçado.

- [ ] **`try/catch` engolindo erro** — `app/(public)/page.tsx:39` e `app/(public)/cursos/page.tsx:40` escondem falha real de rede: a home mostra "nenhum curso" e ninguém fica sabendo.

- [ ] **Comissão definida em três lugares** — `PLATFORM_COMMISSION_RATE` no `.env.example` (não lido), a coluna `commission_rate`, e `?? 20` hardcoded em 4 arquivos. Fonte única: a coluna.

- [ ] **`Notebook.saveContent` sem tratamento de erro** — `components/player/Notebook.tsx:41`: o upsert não checa `error` e a UI mostra "Salvo às HH:MM" mesmo quando falhou.

- [ ] **Sem `error.tsx` por rota** — só o global em `app/error.tsx`. Uma query que falha em `/aluno/...` derruba a tela toda em vez de degradar a seção.

---

## Ordem sugerida

1. **Upload de vídeo** — sem isso não existe produto.
2. **Fluxo de professor** — onboarding inalcançável, `connect/return` bloqueado, `refresh_url` 405. Os três são o mesmo caminho de usuário, resolve junto.
3. **Checkout** — erro em JSON na tela e carrinho não limpo. Baratos, ambos visíveis pro usuário final.
4. **Estoque atômico** e **renomear a migration duplicada**.
5. **Páginas públicas dinâmicas** — tirar a Navbar da dependência de `cookies()`.
6. **Limpeza** — deps órfãs, `card.tsx`, view `teacher_profiles_public`, tipos do React.
7. **Performance com volume** — RPC de agregação e paginação. Só valem a pena com mais dados; deixados por último de propósito.

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
