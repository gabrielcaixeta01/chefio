# Melhorias — Chefio

Backlog de dívida técnica. Revisão inicial em 05/08/2026, reavaliação completa do projeto em 06/08/2026. Marque o checkbox ao resolver.

**Contexto que amarra a maior parte da lista:** o app não usa Server Actions — toda mutação vai do browser direto pro Supabase. Isso faz do RLS a única camada de autorização, então cada furo de policy é explorável do console do navegador.

**Estado geral (06/08/2026):** `npm run build` e `npx tsc --noEmit` passam. A arquitetura está coerente — route groups por papel, RLS como fonte de verdade, dinheiro só via webhook com service role. Todo o backlog levantado na revisão de 06/08 (🔴 quebrado, 🟠 correção de dados, 🔵 código morto, 🟡 performance) foi resolvido no mesmo dia. O que resta é ⚪ qualidade — lint, testes, tipos — nada bloqueia o fluxo de ponta a ponta nem tem impacto de performance mensurável hoje.

---

## 🔴 Quebrado — impede o fluxo de ponta a ponta

Todos os 6 itens abaixo foram corrigidos em 06/08/2026 — ver `## ✅ Resolvido (06/08/2026)`.

---

## 🟠 Correção de dados

Todos os 3 itens desta seção foram corrigidos em 06/08/2026 — ver `## ✅ Resolvido (06/08/2026)`.

---

## 🟡 Performance

Todos os 4 itens desta seção foram resolvidos em 06/08/2026 — ver `## ✅ Resolvido (06/08/2026)`.

---

## 🔵 Código morto e não utilizado

Todos os itens desta seção foram resolvidos em 06/08/2026 — ver `## ✅ Resolvido (06/08/2026)`. Uma ressalva: o item sobre `globals.d.ts` estava **errado** — não era código morto, ver nota na entrada correspondente.

---

## ⚪ Qualidade e manutenção

`@types/react`/`@types/react-dom` alinhados em `^18` (resolvido em 06/08/2026, ver `## ✅ Resolvido`). Restante:

- [ ] **Sem lint** — `package.json` tem só `dev`/`build`/`start`, sem `eslint-config-next` instalado. O commit `f326195 "melhorias finais de lint"` não deixou configuração nenhuma no repo.

- [ ] **Sem teste** — num app que move dinheiro, o cálculo de comissão (`webhook/route.ts:78`) e a idempotência dos webhooks são os candidatos óbvios a teste unitário.

- [ ] **`as any` mascarando joins** — `app/api/stripe/checkout/route.ts:50`, `app/api/bunny/signed-url/route.ts:24`, `app/api/bunny/upload-url/route.ts:21`, `app/(aluno)/aluno/cursos/[slug]/aulas/[lessonId]/page.tsx:82`, `app/(public)/page.tsx:29`. 19 ocorrências no total; `types/database.ts` (253 linhas) está sendo desperdiçado.

- [ ] **`try/catch` engolindo erro** — `app/(public)/page.tsx:39` e `app/(public)/cursos/page.tsx:40` escondem falha real de rede: a home mostra "nenhum curso" e ninguém fica sabendo.

- [ ] **Comissão ainda hardcoded em `?? 20` em 4 arquivos** — a coluna `commission_rate` é a fonte única de verdade, mas o fallback se repete em vez de vir de um só lugar. (A variável `PLATFORM_COMMISSION_RATE`, que não era lida em canto nenhum, saiu do `.env.example` na limpeza de 06/08/2026 — essa parte já não é mais duplicação.)

- [ ] **`Notebook.saveContent` sem tratamento de erro** — `components/player/Notebook.tsx:41`: o upsert não checa `error` e a UI mostra "Salvo às HH:MM" mesmo quando falhou.

- [ ] **Sem `error.tsx` por rota** — só o global em `app/error.tsx`. Uma query que falha em `/aluno/...` derruba a tela toda em vez de degradar a seção.

---

## Ordem sugerida

🔴 Quebrado, 🟠 Correção de dados, 🔵 Código morto e 🟡 Performance resolvidos por completo. Só resta ⚪ Qualidade — nenhum item bloqueia nada nem tem efeito de performance mensurável:

1. Lint, testes, `as any`, `error.tsx` por rota, consolidar a comissão hardcoded.

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
