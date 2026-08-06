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

  const { data: teacherProfile } = await supabase
    .from('teacher_profiles')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .single()

  let accountId = teacherProfile?.stripe_account_id

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'BR',
      capabilities: { transfers: { requested: true } },
    })
    accountId = account.id

    await supabase
      .from('teacher_profiles')
      .update({ stripe_account_id: accountId })
      .eq('user_id', user.id)
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
