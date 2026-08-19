import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DASHBOARD_BY_ROLE: Record<string, string> = {
  admin: '/admin',
  teacher: '/professor',
  student: '/aluno',
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // `next` vem da URL. Sem validar, um `next=https://exemplo.com` monta
  // `${origin}https://exemplo.com` — URL inválida, e o redirect estoura 500.
  // Mesma regra já aplicada em app/(public)/login/page.tsx.
  const nextParam = searchParams.get('next')
  const next = nextParam?.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        // `next` explícito ganha do dashboard do papel. Sem isso a
        // redefinição de senha (7.3) caía em /aluno com a sessão aberta e a
        // senha antiga intacta — e o `next` que o middleware anexa ao barrar
        // uma rota protegida também era ignorado.
        const destination =
          next ?? (profile?.role ? DASHBOARD_BY_ROLE[profile.role] : undefined) ?? '/'

        return NextResponse.redirect(`${origin}${destination}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
