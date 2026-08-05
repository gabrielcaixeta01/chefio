# Melhorias — Chefio

Backlog de dívida técnica levantado na revisão de 05/08/2026. Marque o checkbox ao resolver.

**Contexto que amarra a maior parte da lista:** o app não usa Server Actions — toda mutação vai do browser direto pro Supabase. Isso faz do RLS a única camada de autorização, então cada furo de policy é explorável do console do navegador.

---

## 🔴 Crítico — segurança e dinheiro

Todos os 7 itens abaixo foram corrigidos em 05/08/2026 — ver `## ✅ Resolvido`.

---

## 🟠 Funcionalidade quebrada

Todos os 5 itens abaixo foram corrigidos em 05/08/2026 — ver `## ✅ Resolvido`.

---

## 🟡 Performance

- [ ] **Middleware consulta `profiles` em toda navegação**
  `middleware.ts:41`, com matcher pegando quase tudo. Cada request paga `getUser()` (round-trip pro Auth) + SELECT.
  **Fix:** role em `app_metadata` do JWT via trigger, lido do token. Alternativa mais barata: restringir o matcher a `/admin/:path*|/professor/:path*|/aluno/:path*|/login|/cadastro`.

- [ ] **Checagem de role triplicada**
  Middleware → layout (`app/(aluno)/layout.tsx:12` e equivalentes) → página: 3 `getUser()` de rede + 2 SELECT antes de renderizar qualquer dado.
  **Fix:** helper `requireRole()` cacheado com `React.cache()` por request; remover a duplicação do layout (o middleware já barrou).

- [ ] **Waterfall de queries sequenciais**
  `app/(aluno)/aluno/cursos/[slug]/aulas/[lessonId]/page.tsx:23-79` são 7 `await` em série. Mesmo padrão em `app/(aluno)/aluno/cursos/[slug]/page.tsx` (5) e `app/(professor)/professor/faturamento/page.tsx` (4).
  **Fix:** resolver `course.id` e agrupar o resto num `Promise.all` — 7 round-trips viram 2.

- [ ] **Agregações em JS sobre a tabela inteira**
  `app/(admin)/admin/page.tsx:19` puxa `amount_paid` de *todas* as matrículas pra somar em memória; mesmo padrão em `admin/financeiro` e `professor/faturamento`. Ok com 50 linhas, derrete com 50 mil.
  **Fix:** RPC com `sum()` / `group by` no Postgres.

- [ ] **Sem paginação em lugar nenhum**
  `/cursos`, `/aluno/loja`, `/admin/matriculas`, `/admin/produtos`, `/admin/cursos` — todos SELECT sem `limit` / `range`.

- [ ] **Páginas públicas 100% dinâmicas**
  `app/(public)/page.tsx` e `app/(public)/cursos/page.tsx` usam `createClient()`, que chama `cookies()` e força render dinâmico por request. É a origem dos ~7s de latência quando o Supabase está lento.
  **Fix:** cliente anônimo sem cookies pros dados públicos + `export const revalidate = 300`.

- [ ] **`get_my_role()` e `auth.uid()` reavaliados por linha**
  Em toda a `00002_rls_policies.sql`. O Postgres não consegue provar estabilidade nesse contexto e chama por linha varrida.
  **Fix:** envolver em subquery — `(select public.get_my_role()) = 'admin'`, `student_id = (select auth.uid())`. É a recomendação oficial do Supabase.

- [ ] **Índices faltando**
  `00001_initial_schema.sql:200-208` cobre courses/lessons/enrollments, mas falta `orders(student_id)`, `order_items(order_id)`, `teacher_payouts(teacher_id)`, `documents(teacher_id)` — todas filtradas por essas colunas em policies e queries.

---

## 🔵 Qualidade e manutenção

- [ ] **`as any` mascarando joins** — `app/api/stripe/checkout/route.ts:50`, `app/api/bunny/signed-url/route.ts:24`, `app/api/bunny/upload-url/route.ts:21`, `app/(aluno)/aluno/cursos/[slug]/aulas/[lessonId]/page.tsx:82`, `app/(public)/page.tsx:29`. `types/database.ts` (253 linhas) está sendo desperdiçado.

- [ ] **Sem lint, sem teste** — `package.json` só tem `dev`/`build`/`start`. Num app que move dinheiro, o webhook do Stripe e o cálculo de comissão são os candidatos óbvios a teste unitário.

- [ ] **`try/catch` engolindo erro** — `app/(public)/page.tsx:39` e `app/(public)/cursos/page.tsx:40` escondem falha real de rede: a home mostra "nenhum curso" e ninguém fica sabendo.

- [ ] **Comissão definida em três lugares** — `PLATFORM_COMMISSION_RATE` no `.env.example` (não lido em canto nenhum), a coluna `commission_rate`, e `?? 20` hardcoded em 4 arquivos. Fonte única: a coluna.

- [ ] **`Notebook.saveContent` sem tratamento de erro** — `components/player/Notebook.tsx:41`: o upsert não checa `error` e a UI mostra "Salvo às HH:MM" mesmo quando falhou.

- [ ] **Sem `error.tsx` por rota** — só o global em `app/error.tsx`. Uma query que falha em `/aluno/...` derruba a tela toda em vez de degradar a seção.

---

## ✅ Resolvido

- [x] **Escalação de privilégio no cadastro** — `supabase/migrations/00003_security_fixes.sql`
  `handle_new_user()` agora sempre grava `role = 'student'`, ignorando o que o cliente manda em `raw_user_meta_data`. Pedido de professor no cadastro cria uma linha `teacher_profiles` com `status = 'pending'`. Novo trigger `teacher_profiles_sync_role` promove o profile pra `'teacher'` quando o admin aprova (`status → 'active'`) e rebaixa pra `'student'` se suspender — a tela `/admin/professores` já cobre esse fluxo sem mudança de UI.

- [x] **Preço do carrinho vem do cliente** — `app/api/stripe/checkout-products/route.ts`
  A rota agora recebe só `{ id, quantity }[]`; preço, nome e estoque são buscados em `products` no servidor, com checagem de estoque antes de criar a sessão do Stripe.

- [x] **Matrícula grátis via RLS** — `supabase/migrations/00003_security_fixes.sql`, `app/api/stripe/checkout/route.ts`
  Policy `enrollments_student_insert` removida — só service role insere. O fluxo de curso grátis em `checkout/route.ts` passou a usar `createAdminClient()` em vez do client da sessão do aluno.

- [x] **Professor aprova o próprio curso** — `supabase/migrations/00003_security_fixes.sql`
  Trigger `courses_guard_status_change` bloqueia qualquer mudança de `status` fora de `draft → pending_review` quando quem executa não é admin.

- [x] **Webhook do Bunny sem autenticação** — `app/api/bunny/webhook/route.ts`
  Exige `BUNNY_WEBHOOK_SECRET` via header `x-webhook-secret` ou querystring (`?secret=`), comparado com `timingSafeEqual`. Configurar a URL do webhook no painel do Bunny com o secret na querystring.

- [x] **`stripe_account_id` exposto publicamente** — `supabase/migrations/00003_security_fixes.sql`
  Policy `teacher_profiles_public_read` removida; leitura pública agora passa pela view `teacher_profiles_public` (`user_id, bio`).

- [x] **`createAdminClient()` mistura service role com cookies do usuário** — `lib/supabase/server.ts`
  Reescrito com `createClient` do `supabase-js`, sem cookie store — roda como service role de verdade. Passou a ser usado no fluxo de matrícula grátis.

- [x] **Pedidos de produto nunca são registrados** — `app/api/stripe/webhook/route.ts`
  Webhook agora ramifica por `session.metadata.type`: pedidos de produto criam `orders` + `order_items` com preço vindo do banco (não do Stripe), decrementam `products.stock`, e o handler de curso continua funcionando como antes. Qualquer evento fora de `checkout.session.completed`, ou faltando metadata essencial, responde 200 em vez de 400 pra não gerar retry storm do Stripe.

- [x] **Webhook de curso sem idempotência** — `supabase/migrations/00004_stripe_idempotency.sql`, `app/api/stripe/webhook/route.ts`
  Índices únicos parciais em `orders.stripe_payment_intent_id` e `teacher_payouts.stripe_transfer_id`. O payout do professor só é criado quando o insert da matrícula não colide (código `23505`) — ou seja, só na primeira vez que o evento chega.

- [x] **Assinatura da URL do Bunny provavelmente inválida** — `app/api/bunny/signed-url/route.ts`
  Trocado HMAC por hash simples `sha256(tokenAuthKey + videoId + expires)`, que é o esquema de token authentication do Bunny Stream. URL passou a apontar pro embed real (`iframe.mediadelivery.net/embed/{library}/{video}`) em vez da CDN direta. **Ainda precisa validar contra uma library real** com "Token Authentication" habilitado — se hoje o vídeo toca sem token, o auth está desligado na conta Bunny e isso é uma configuração a mudar lá, não só código.

- [x] **`VideoPlayer` acumula listeners** — `components/player/VideoPlayer.tsx`
  Listener de `message` migrou pra um `useEffect` próprio com cleanup, saindo do `onLoad` do iframe.

- [x] **`CartContext` grava `[]` por cima do carrinho salvo** — `contexts/CartContext.tsx`
  Novo estado `hydrated`, setado depois de ler o `localStorage`; o effect de persistência não escreve nada até isso acontecer.

- [x] **Menu hambúrguer invisível no mobile** — `components/layout/MobileNav.tsx`
  O `backdrop-blur-md` do header (`Navbar.tsx:64`) transforma o header em containing block pra descendentes `position: fixed`. O painel com `fixed inset-x-0 top-16 bottom-0` resolvia contra os 64px da barra e colapsava pra altura zero — sobrava só a linha do `border-t` sobre a página.
  Resolvido com `createPortal` pro `document.body`, tirando o painel do containing block. Adicionado `overflow-y-auto` e `md:hidden` próprio (o painel não está mais dentro do wrapper que escondia no desktop).
  Depois ganhou abertura e fechamento animados: o painel fica sempre montado (para animar a saída) e a curva da marca virou o token `--ease-azulejo` em `app/globals.css`, reusado por `.vidrado` e `.surge`.

---

## Ordem sugerida

Todo o 🔴 Crítico e o 🟠 Funcionalidade quebrada estão resolvidos. Restam 🟡 Performance e 🔵 Qualidade e manutenção. Sugestão de ordem:

1. Role no `app_metadata` do JWT (mata o SELECT do middleware + a checagem triplicada de uma vez).
2. `Promise.all` nos waterfalls de query (lesson player, curso, faturamento).
3. RLS com `(select ...)` na `00002_rls_policies.sql` — recomendação oficial do Supabase, barato de aplicar.
4. Índices faltando (`orders`, `order_items`, `teacher_payouts`, `documents`).
5. Paginação e RPC de agregação — só valem a pena quando o volume de dados justificar.
6. 🔵 Qualidade: `as any`, lint/testes, `error.tsx` por rota — sem pressa, não bloqueiam nada.
