import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const ROLE_ROUTES: Record<string, string> = {
  '/admin': 'admin',
  '/professor': 'teacher',
  '/aluno': 'student',
}

const DASHBOARD_BY_ROLE: Record<string, string> = {
  admin: '/admin',
  teacher: '/professor',
  student: '/aluno',
}

/**
 * `NextResponse.redirect()` cria uma resposta nova — os cookies de sessão que
 * `updateSession()` acabou de renovar vivem em `supabaseResponse` e seriam
 * descartados. Sem copiar, um access token expirado nunca é substituído: o
 * browser reenvia o token velho, `getUser()` devolve null de novo e a pessoa
 * fica em loop entre a rota protegida e o /login. Só aparece em produção,
 * porque em dev a sessão raramente expira no meio do teste.
 */
function redirectPreservandoSessao(url: URL, base: NextResponse) {
  const response = NextResponse.redirect(url)
  base.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Se as credenciais do Supabase não estiverem configuradas, passa direto (dev sem backend)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next()
  }

  const { supabaseResponse, user } = await updateSession(request)

  // Protege rotas privadas
  const protectedPrefix = Object.keys(ROLE_ROUTES).find((prefix) =>
    pathname.startsWith(prefix)
  )

  // Role vem do JWT (app_metadata), sincronizado via trigger — sem SELECT em profiles.
  // 'owner' (dono/financeiro, migration 00015) é um admin com poderes a mais:
  // mesmas rotas, mesmo dashboard. A diferença só aparece na edição de comissão.
  const rawRole = user?.app_metadata?.role as string | undefined
  const role = rawRole === 'owner' ? 'admin' : rawRole

  if (protectedPrefix) {
    // Não autenticado → redireciona para login
    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('next', pathname)
      return redirectPreservandoSessao(loginUrl, supabaseResponse)
    }

    const requiredRole = ROLE_ROUTES[protectedPrefix]

    if (role !== requiredRole) {
      // Role errado → redireciona para o dashboard correto.
      // Autenticado mas sem claim de role (JWT emitido antes da 00005, ou
      // trigger que não rodou) cairia em /login e voltaria pra cá em loop,
      // já que a regra de baixo só desvia de /login quem TEM role. Mandar
      // pra home quebra o ciclo e deixa a pessoa navegar.
      const correctDashboard = role ? DASHBOARD_BY_ROLE[role] ?? '/' : '/'
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = correctDashboard
      redirectUrl.search = ''
      return redirectPreservandoSessao(redirectUrl, supabaseResponse)
    }
  }

  // Usuário autenticado tentando acessar /login ou /cadastro → redireciona
  if (user && role && (pathname === '/login' || pathname === '/cadastro')) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = DASHBOARD_BY_ROLE[role] ?? '/'
    redirectUrl.search = ''
    return redirectPreservandoSessao(redirectUrl, supabaseResponse)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
