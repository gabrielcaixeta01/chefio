import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser, roleFromUser } from '@/lib/auth/session'

/**
 * Contas Stripe Express não têm acesso ao dashboard.stripe.com — o link fixo
 * que a tela de faturamento apontava caía numa tela de login que o professor
 * nunca consegue passar. O acesso correto é um login link de uso único,
 * gerado pela plataforma.
 *
 * GET (e não POST) porque isso é um <a> comum na página; o efeito colateral
 * é do lado do Stripe, e o link expira sozinho.
 */
export async function GET(req: NextRequest) {
  const falha = (motivo: string) =>
    NextResponse.redirect(new URL(`/professor/faturamento?erro=${motivo}`, req.url))

  if (!process.env.STRIPE_SECRET_KEY) return falha('stripe_nao_configurado')

  const user = await getAuthedUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))
  if (roleFromUser(user) !== 'teacher') return NextResponse.redirect(new URL('/', req.url))

  const supabase = await createClient()
  const { data: teacherProfile } = await supabase
    .from('teacher_profiles')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!teacherProfile?.stripe_account_id) return falha('conta_nao_conectada')

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const link = await stripe.accounts.createLoginLink(teacherProfile.stripe_account_id)
    return NextResponse.redirect(link.url)
  } catch (err) {
    // createLoginLink falha enquanto a conta não completou o onboarding.
    console.error('Stripe login link error:', err)
    return falha('onboarding_incompleto')
  }
}
