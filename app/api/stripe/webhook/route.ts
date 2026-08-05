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

  const total = (session.amount_total ?? 0) / 100
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      student_id: studentId,
      status: 'paid',
      total,
      stripe_payment_intent_id: paymentIntentId,
    })
    .select('id')
    .single()

  if (orderError) {
    if (orderError.code === '23505') {
      // Pedido já registrado — evento repetido.
      return NextResponse.json({ ok: true })
    }
    console.error('Order error:', orderError)
    return NextResponse.json({ error: 'Order failed' }, { status: 500 })
  }

  const { data: products } = await supabase
    .from('products')
    .select('id, price, stock')
    .in('id', items.map((i) => i.productId))

  const productById = new Map((products ?? []).map((p) => [p.id, p]))

  const orderItems = items
    .filter((item) => productById.has(item.productId))
    .map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: productById.get(item.productId)!.price,
    }))

  if (orderItems.length > 0) {
    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
    if (itemsError) console.error('Order items error:', itemsError)
  }

  for (const item of items) {
    const product = productById.get(item.productId)
    if (!product) continue
    await supabase
      .from('products')
      .update({ stock: Math.max(0, product.stock - item.quantity) })
      .eq('id', item.productId)
  }

  return NextResponse.json({ ok: true })
}
