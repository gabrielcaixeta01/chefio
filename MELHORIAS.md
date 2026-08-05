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

- [ ] **Agregações em JS sobre a tabela inteira**
  `app/(admin)/admin/page.tsx:19` puxa `amount_paid` de *todas* as matrículas pra somar em memória; mesmo padrão em `admin/financeiro` e `professor/faturamento`. Ok com 50 linhas, derrete com 50 mil.
  **Fix:** RPC com `sum()` / `group by` no Postgres.

- [ ] **Sem paginação em lugar nenhum**
  `/cursos`, `/aluno/loja`, `/admin/matriculas`, `/admin/produtos`, `/admin/cursos` — todos SELECT sem `limit` / `range`.

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

- [x] **Middleware consulta `profiles` em toda navegação** / **Checagem de role triplicada** — `supabase/migrations/00005_role_jwt_sync.sql`, `middleware.ts`, `lib/auth/session.ts`, `app/(aluno|professor|admin)/layout.tsx`, `components/layout/Navbar.tsx`
  Trigger `sync_role_to_jwt` grava o role em `auth.users.raw_app_meta_data`, que o Supabase Auth embute no access token — `user.app_metadata.role` fica disponível sem SELECT. Middleware, os três layouts protegidos e a Navbar pararam de consultar `profiles`. Novo helper `getAuthedUser()` (`lib/auth/session.ts`) usa `React.cache()` pra dedupar `getUser()` dentro do mesmo request quando layout e página pedem o usuário. **Sessões já ativas só recebem o claim novo no próximo refresh de token** — o backfill cobre usuários existentes, mas o access token já emitido segue com o payload antigo até expirar/renovar.

- [x] **Waterfall de queries sequenciais** — `app/(aluno)/aluno/cursos/[slug]/aulas/[lessonId]/page.tsx`, `app/(aluno)/aluno/cursos/[slug]/page.tsx`, `app/(professor)/professor/faturamento/page.tsx`
  Queries que não dependem uma da outra agora rodam em `Promise.all`. Aula: 7 round-trips → 2 (`course` primeiro, resto em paralelo). Curso do aluno: 5 → 3 (`progressRows` continua depois porque precisa dos ids de `lessons`). Faturamento: 4 → 2 (`enrollments` continua depois porque precisa dos ids de `courses`).

- [x] **Páginas públicas 100% dinâmicas** — `lib/supabase/public.ts` (novo), `app/(public)/page.tsx`, `app/(public)/cursos/page.tsx`
  As duas páginas trocaram `createClient()` (cookies) por `createPublicClient()` (client anônimo, sem `cookies()`) e ganharam `export const revalidate = 300`. **Ressalva:** a `Navbar` (`components/layout/Navbar.tsx`), que fica no layout público, ainda chama `getAuthedUser()` → `cookies()` pra saber se tem sessão — isso continua forçando toda a rota pública a renderizar dinâmica no Next 14 (sem Partial Prerendering), então o ganho de latência real só aparece se a Navbar também parar de depender de cookies no servidor (ex.: checar sessão no client, ou habilitar PPR). Build confirma `/` e `/cursos` como `ƒ Dynamic` ainda.

- [x] **`get_my_role()` e `auth.uid()` reavaliados por linha** / **Índices faltando** — `supabase/migrations/00006_rls_performance.sql`
  Todas as policies com `auth.uid()` ou `get_my_role()` no `USING`/`WITH CHECK` foram alteradas via `ALTER POLICY` pra envolver as chamadas em subquery (`(select auth.uid())`), forçando o Postgres a resolver uma vez por statement. Adicionados os índices que faltavam: `orders(student_id)`, `order_items(order_id)`, `teacher_payouts(teacher_id)`, `documents(teacher_id)`.

- [x] **Menu hambúrguer invisível no mobile** — `components/layout/MobileNav.tsx`
  O `backdrop-blur-md` do header (`Navbar.tsx:64`) transforma o header em containing block pra descendentes `position: fixed`. O painel com `fixed inset-x-0 top-16 bottom-0` resolvia contra os 64px da barra e colapsava pra altura zero — sobrava só a linha do `border-t` sobre a página.
  Resolvido com `createPortal` pro `document.body`, tirando o painel do containing block. Adicionado `overflow-y-auto` e `md:hidden` próprio (o painel não está mais dentro do wrapper que escondia no desktop).
  Depois ganhou abertura e fechamento animados: o painel fica sempre montado (para animar a saída) e a curva da marca virou o token `--ease-azulejo` em `app/globals.css`, reusado por `.vidrado` e `.surge`.

---

## Ordem sugerida

🔴 Crítico e 🟠 Funcionalidade quebrada resolvidos. Da 🟡 Performance, restam só paginação e RPC de agregação — deixados de lado de propósito porque só valem a pena com volume de dados maior. Restante:

1. **Agregações em JS sobre a tabela inteira** — RPC `sum()`/`group by` em `admin/page.tsx`, `admin/financeiro`, `professor/faturamento`. Maior esforço do que o resto (precisa de função SQL nova por tela).
2. **Paginação** — `/cursos`, `/aluno/loja`, `/admin/matriculas`, `/admin/produtos`, `/admin/cursos`.
3. Se quiser fechar de vez a latência das páginas públicas: tirar a `Navbar` da dependência de `cookies()` no servidor (ver ressalva acima) — só assim `/` e `/cursos` viram estáticas de verdade.
4. 🔵 Qualidade: `as any`, lint/testes, `error.tsx` por rota — sem pressa, não bloqueiam nada.
