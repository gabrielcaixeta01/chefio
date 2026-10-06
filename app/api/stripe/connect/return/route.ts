import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.redirect(new URL('/professor/onboarding?error=stripe_not_configured', req.url))
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  const { data: teacherProfile, error: profileError } = await supabase
    .from('teacher_profiles')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .maybeSingle()

  // "success=true" sem ter conseguido ler o perfil diria ao professor que
  // está tudo certo quando nada foi conferido.
  if (profileError) {
    console.error('Connect return: perfil não lido:', profileError)
    return NextResponse.redirect(new URL('/professor/onboarding?error=perfil_nao_lido', req.url))
  }

  if (teacherProfile?.stripe_account_id) {
    const account = await stripe.accounts.retrieve(teacherProfile.stripe_account_id)
    if (account.charges_enabled) {
      // Ativação de conta é decisão do sistema (Stripe confirmou charges_enabled),
      // não do próprio professor — a trigger guard_teacher_profile_admin_columns
      // (00007) bloqueia update de `status` pelo client da sessão do usuário.
      const admin = createAdminClient()
      const { error: activateError } = await admin
        .from('teacher_profiles')
        .update({ status: 'active' })
        .eq('user_id', user.id)
      if (activateError) {
        console.error('Connect return: ativação não gravada:', activateError)
        return NextResponse.redirect(new URL('/professor/onboarding?error=ativacao_falhou', req.url))
      }
    }
  }

  return NextResponse.redirect(new URL('/professor/onboarding?success=true', req.url))
}
