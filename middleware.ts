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
  const role = user?.app_metadata?.role as string | undefined

  if (protectedPrefix) {
    // Não autenticado → redireciona para login
    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const requiredRole = ROLE_ROUTES[protectedPrefix]

    if (role !== requiredRole) {
      // Role errado → redireciona para o dashboard correto
      const correctDashboard = role ? DASHBOARD_BY_ROLE[role] : '/login'
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = correctDashboard
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Usuário autenticado tentando acessar /login ou /cadastro → redireciona
  if (user && role && (pathname === '/login' || pathname === '/cadastro')) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = DASHBOARD_BY_ROLE[role]
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
