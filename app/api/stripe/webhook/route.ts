import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServerClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type SupabaseAdmin = SupabaseClient<Database>

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

  // Eventos que não tratamos retornam 200 — um 400 faz o Stripe retentar por dias.
  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ ok: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (session.metadata?.type === 'products') {
    return handleProductOrder(supabase, session)
  }
  return handleCourseEnrollment(supabase, session)
}

async function handleCourseEnrollment(
  supabase: SupabaseAdmin,
  session: Stripe.Checkout.Session
) {
  const { courseId, studentId, teacherId } = session.metadata ?? {}

  if (!courseId || !studentId) {
    console.error('checkout.session.completed sem courseId/studentId:', session.id)
    return NextResponse.json({ ok: true })
  }

  const amountPaid = (session.amount_total ?? 0) / 100
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null

  const { error: enrollError } = await supabase.from('enrollments').insert({
    student_id: studentId,
    course_id: courseId,
    amount_paid: amountPaid,
    stripe_payment_intent_id: paymentIntentId,
  })

  if (enrollError) {
    if (enrollError.code === '23505') {
      // Matrícula já existia — evento repetido, payout já foi processado da primeira vez.
      return NextResponse.json({ ok: true })
    }
    console.error('Enrollment error:', enrollError)
    return NextResponse.json({ error: 'Enrollment failed' }, { status: 500 })
  }

  // Só cria payout quando a matrícula foi de fato criada agora.
  if (teacherId) {
    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('commission_rate')
      .eq('user_id', teacherId)
      .single()

    const commissionRate = teacherProfile?.commission_rate ?? 20
    const teacherAmount = amountPaid * (1 - commissionRate / 100)

    const { error: payoutError } = await supabase.from('teacher_payouts').insert({
      teacher_id: teacherId,
      amount: teacherAmount,
      status: 'pending',
      stripe_transfer_id: session.id,
    })

    if (payoutError && payoutError.code !== '23505') {
      console.error('Payout error:', payoutError)
    }
  }

  return NextResponse.json({ ok: true })
}

async function handleProductOrder(
  supabase: SupabaseAdmin,
  session: Stripe.Checkout.Session
) {
  const { studentId, itemsSummary } = session.metadata ?? {}

  if (!studentId || !itemsSummary) {
    console.error('checkout.session.completed (products) sem studentId/itemsSummary:', session.id)
    return NextResponse.json({ ok: true })
  }

  const items = itemsSummary
    .split(',')
    .map((pair) => {
      const [productId, quantityRaw] = pair.split(':')
      return { productId, quantity: parseInt(quantityRaw, 10) }
    })
    .filter((item) => item.productId && Number.isFinite(item.quantity) && item.quantity > 0)

  if (items.length === 0) {
    return NextResponse.json({ ok: true })
  }

  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null

  // Insert de orders/order_items + baixa de estoque rodam numa transação só
  // dentro da função (00009_atomic_product_order.sql) — preço e estoque são
  // lidos com a linha travada, então dois webhooks concorrentes pro mesmo
  // produto não perdem baixa um do outro.
  const { error: orderError } = await supabase.rpc('create_product_order', {
    p_student_id: studentId,
    p_stripe_payment_intent_id: paymentIntentId,
    p_items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
  })

  if (orderError) {
    console.error('Order error:', orderError)
    return NextResponse.json({ error: 'Order failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
