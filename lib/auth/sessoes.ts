import type { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/** Decisão 3.6 — duas telas ao mesmo tempo, não mais. */
export const LIMITE_SESSOES = 2

/** Guarda "esta sessão já foi conferida às X" para não bater no banco a cada request. */
const COOKIE_CARIMBO = 'chefio_sessao'
const INTERVALO_MS = 3 * 60 * 1000

/**
 * `session_id` é claim do próprio access token. Ler sem verificar assinatura é
 * seguro aqui porque `updateSession()` já chamou `getUser()`, que valida o
 * token contra o Auth server — se chegou até esta função, o JWT é legítimo.
 */
function lerSessionId(accessToken: string): string | null {
  const payload = accessToken.split('.')[1]
  if (!payload) return null
  try {
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const claims = JSON.parse(new TextDecoder().decode(bytes))
    return typeof claims?.session_id === 'string' ? claims.session_id : null
  } catch {
    return null
  }
}

/**
 * Carimba a sessão atual e devolve `true` quando ela foi derrubada por um
 * login mais novo em outro aparelho (decisão 3.6).
 *
 * Falha em silêncio (devolve `false`) se o banco não responder: derrubar
 * alguém por causa de um erro de rede é pior do que deixar passar uma terceira
 * tela por alguns minutos.
 */
export async function verificarLimiteDeSessoes(
  request: NextRequest,
  response: NextResponse,
  supabase: SupabaseClient<Database>,
  { forcar = false }: { forcar?: boolean } = {}
): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token
  if (!accessToken) return false

  const sessionId = lerSessionId(accessToken)
  if (!sessionId) return false

  const carimbo = request.cookies.get(COOKIE_CARIMBO)?.value
  if (!forcar && carimbo) {
    const [idCarimbado, quando] = carimbo.split('|')
    if (idCarimbado === sessionId && Date.now() - Number(quando) < INTERVALO_MS) {
      return false
    }
  }

  const { data: viva, error } = await supabase.rpc('touch_session', {
    p_session_id: sessionId,
    p_user_agent: request.headers.get('user-agent')?.slice(0, 200) ?? null,
  })

  if (error) return false
  if (viva === false) return true

  response.cookies.set(COOKIE_CARIMBO, `${sessionId}|${Date.now()}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  })
  return false
}

/**
 * Apaga os cookies do Supabase só neste aparelho. Não dá pra usar
 * `auth.signOut()`: o padrão dele é escopo global e derrubaria também a sessão
 * que acabou de entrar — exatamente quem deveria continuar.
 */
export function limparSessaoLocal(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-') || cookie.name === COOKIE_CARIMBO) {
      response.cookies.set(cookie.name, '', { path: '/', maxAge: 0 })
    }
  }
}
