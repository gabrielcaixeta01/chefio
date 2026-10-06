import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser, roleFromUser } from '@/lib/auth/session'

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe não configurado' }, { status: 503 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const user = await getAuthedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (roleFromUser(user) !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  const { data: teacherProfile, error: profileError } = await supabase
    .from('teacher_profiles')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .maybeSingle()

  // Sem esta checagem uma falha de leitura parece "sem conta conectada" e o
  // clique cria outra conta Express no Stripe.
  if (profileError) {
    console.error('Connect onboarding: perfil não lido:', profileError)
    return NextResponse.json({ error: 'Não foi possível ler o perfil.' }, { status: 500 })
  }

  let accountId = teacherProfile?.stripe_account_id

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'BR',
      capabilities: { transfers: { requested: true } },
    })
    accountId = account.id

    const { error: saveError } = await supabase
      .from('teacher_profiles')
      .update({ stripe_account_id: accountId })
      .eq('user_id', user.id)

    // Conta criada no Stripe e não gravada ficaria órfã; o próximo clique
    // criaria mais uma. O id vai pro log pra dar pra reaproveitar na mão.
    if (saveError) {
      console.error('Connect onboarding: conta não gravada:', accountId, saveError)
      return NextResponse.json({ error: 'Não foi possível salvar a conta.' }, { status: 500 })
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    // Precisa ser uma página (GET), não a rota de API acima (só aceita POST) —
    // o Stripe redireciona o browser pra cá quando o link expira ou o professor
    // abandona o formulário antes de terminar.
    refresh_url: `${appUrl}/professor/onboarding`,
    return_url: `${appUrl}/api/stripe/connect/return`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url })
}
