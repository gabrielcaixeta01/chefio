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

  const { supabaseResponse, user, supabase } = await updateSession(request)

  // Protege rotas privadas
  const protectedPrefix = Object.keys(ROLE_ROUTES).find((prefix) =>
    pathname.startsWith(prefix)
  )

  if (protectedPrefix) {
    // Não autenticado → redireciona para login
    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Busca o role do perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const requiredRole = ROLE_ROUTES[protectedPrefix]

    if (!profile || profile.role !== requiredRole) {
      // Role errado → redireciona para o dashboard correto
      const correctDashboard = profile?.role
        ? DASHBOARD_BY_ROLE[profile.role]
        : '/login'
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = correctDashboard
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Usuário autenticado tentando acessar /login ou /cadastro → redireciona
  if (user && (pathname === '/login' || pathname === '/cadastro')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = DASHBOARD_BY_ROLE[profile.role]
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
