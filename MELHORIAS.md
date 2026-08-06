# Melhorias — Chefio

Backlog de dívida técnica. Revisão inicial em 05/08/2026, reavaliação completa do projeto em 06/08/2026. Marque o checkbox ao resolver.

**Contexto que amarra a maior parte da lista:** o app não usa Server Actions — toda mutação vai do browser direto pro Supabase. Isso faz do RLS a única camada de autorização, então cada furo de policy é explorável do console do navegador.

**Estado geral (06/08/2026):** `npm run build` e `npx tsc --noEmit` passam. A arquitetura está coerente — route groups por papel, RLS como fonte de verdade, dinheiro só via webhook com service role. O que sobra não é problema de estrutura: é um conjunto de features que estão quebradas na prática.

---

## 🔴 Quebrado — impede o fluxo de ponta a ponta

Todos os 6 itens abaixo foram corrigidos em 06/08/2026 — ver `## ✅ Resolvido (06/08/2026)`.

---

## 🟠 Correção de dados

Todos os 3 itens desta seção foram corrigidos em 06/08/2026 — ver `## ✅ Resolvido (06/08/2026)`.

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

🔴 Quebrado e 🟠 Correção de dados resolvidos por completo. Restante:

1. **Páginas públicas dinâmicas** — tirar a Navbar da dependência de `cookies()`.
2. **Limpeza** — deps órfãs, `card.tsx`, view `teacher_profiles_public`, tipos do React.
3. **Performance com volume** — RPC de agregação e paginação. Só valem a pena com mais dados; deixados por último de propósito.

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
