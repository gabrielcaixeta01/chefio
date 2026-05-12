import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.redirect(new URL('/professor/onboarding?error=stripe_not_configured', req.url))
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  const { data: teacherProfile } = await supabase
    .from('teacher_profiles')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .single()

  if (teacherProfile?.stripe_account_id) {
    const account = await stripe.accounts.retrieve(teacherProfile.stripe_account_id)
    if (account.charges_enabled) {
      await supabase
        .from('teacher_profiles')
        .update({ status: 'active' })
        .eq('user_id', user.id)
    }
  }

  return NextResponse.redirect(new URL('/professor/onboarding?success=true', req.url))
}
