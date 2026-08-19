import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServerClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { COMISSAO_PADRAO } from '@/lib/utils'

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
  if (event.type !== 'checkout.session.completed' && event.type !== 'charge.dispute.created') {
    return NextResponse.json({ ok: true })
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (event.type === 'charge.dispute.created') {
    return handleDispute(supabase, event.data.object as Stripe.Dispute)
  }

  const session = event.data.object as Stripe.Checkout.Session

  if (session.metadata?.type === 'products') {
    return handleProductOrder(supabase, session)
  }
  return handleCourseEnrollment(supabase, session)
}

async function handleCourseEnrollment(
  supabase: SupabaseAdmin,
  session: Stripe.Checkout.Session
) {
  const { courseId, studentId, teacherId, couponId, discountAmount } = session.metadata ?? {}

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
    coupon_id: couponId || null,
    discount_amount: Number(discountAmount) || 0,
  })

  if (enrollError) {
    if (enrollError.code === '23505') {
      // Linha já existe. Duas causas possíveis: evento repetido (payout já
      // saiu da primeira vez, nada a fazer) ou recompra de um curso que tinha
      // sido reembolsado — o unique (student_id, course_id) não deixa inserir
      // outra, então reativa a que está lá e segue pro payout.
      const { data: revivida } = await supabase
        .from('enrollments')
        .update({
          refund_status: 'none',
          refunded_at: null,
          refund_requested_at: null,
          refund_amount: null,
          refund_reason: null,
          refund_review_note: null,
          amount_paid: amountPaid,
          stripe_payment_intent_id: paymentIntentId,
          coupon_id: couponId || null,
          discount_amount: Number(discountAmount) || 0,
        })
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .not('refunded_at', 'is', null)
        .select('id')
        .maybeSingle()

      if (!revivida) return NextResponse.json({ ok: true })
    } else {
      console.error('Enrollment error:', enrollError)
      return NextResponse.json({ error: 'Enrollment failed' }, { status: 500 })
    }
  }

  // Baixa do cupom só aqui: no checkout, carrinho abandonado queimaria um
  // cupom de uso limitado sem venda nenhuma.
  if (couponId) {
    const { error } = await supabase.rpc('redeem_coupon', { p_coupon_id: couponId })
    if (error) console.error('redeem_coupon error:', error)
  }

  // Só cria payout quando a matrícula foi de fato criada agora.
  if (teacherId) {
    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('commission_rate')
      .eq('user_id', teacherId)
      .maybeSingle()

    const commissionRate = teacherProfile?.commission_rate ?? COMISSAO_PADRAO
    // Base é o preço cheio, não o valor cobrado: com cupom quem banca o
    // desconto é a plataforma (decisão 2.6), então o professor não sente.
    const precoCheio = amountPaid + (Number(discountAmount) || 0)
    const teacherAmount = precoCheio * (1 - commissionRate / 100)

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

/**
 * Chargeback (decisão 2.4): o aluno perde o acesso na hora, mas o prejuízo
 * é da plataforma — por isso `p_clawback: false`, sem lançar débito contra o
 * professor. Não chama refund no Stripe: numa disputa a bandeira já retirou
 * o dinheiro, um refund por cima cobraria duas vezes.
 */
async function handleDispute(supabase: SupabaseAdmin, dispute: Stripe.Dispute) {
  const paymentIntentId =
    typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id

  if (!paymentIntentId) return NextResponse.json({ ok: true })

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, amount_paid')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  if (!enrollment) {
    // Pode ser disputa de pedido da loja — tratado na seção 8, ainda não aqui.
    console.warn('charge.dispute.created sem matrícula correspondente:', paymentIntentId)
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabase.rpc('process_refund', {
    p_enrollment_id: enrollment.id,
    p_amount: Number(enrollment.amount_paid ?? 0),
    p_clawback: false,
    p_status: 'chargeback',
  })

  if (error) console.error('Dispute error:', error)
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
