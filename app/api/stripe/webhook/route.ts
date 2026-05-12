import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServerClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe não configurado' }, { status: 503 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ ok: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const { courseId, studentId, teacherId } = session.metadata ?? {}

  if (!courseId || !studentId) {
    return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const amountPaid = (session.amount_total ?? 0) / 100

  // Create enrollment
  const { error: enrollError } = await supabase.from('enrollments').insert({
    student_id: studentId,
    course_id: courseId,
    amount_paid: amountPaid,
    stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
  })

  if (enrollError && enrollError.code !== '23505') {
    // 23505 = duplicate key (already enrolled), ignore
    console.error('Enrollment error:', enrollError)
    return NextResponse.json({ error: 'Enrollment failed' }, { status: 500 })
  }

  // Record payout for teacher
  if (teacherId) {
    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('commission_rate')
      .eq('user_id', teacherId)
      .single()

    const commissionRate = teacherProfile?.commission_rate ?? 20
    const teacherAmount = amountPaid * (1 - commissionRate / 100)

    await supabase.from('teacher_payouts').insert({
      teacher_id: teacherId,
      amount: teacherAmount,
      status: 'pending',
      stripe_transfer_id: session.id,
    })
  }

  return NextResponse.json({ ok: true })
}
