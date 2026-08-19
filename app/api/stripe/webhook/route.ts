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
    // Pode ser disputa de pedido da loja. O questionário não decidiu o que
    // fazer nesse caso (a 8.6 cobre devolução, não contestação no cartão),
    // então fica só o registro em log até essa regra existir.
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

/**
 * Pedido da loja pago (decisões 8.1 e 8.4).
 *
 * O pedido já existe em 'pending' desde o checkout — aqui só entram o
 * endereço que o Stripe coletou, a baixa de estoque e o repasse do professor
 * pelos itens que vieram da página de uma aula. Tudo dentro de
 * `confirm_product_order`, numa transação só e idempotente.
 */
async function handleProductOrder(
  supabase: SupabaseAdmin,
  session: Stripe.Checkout.Session
) {
  const orderId = session.metadata?.orderId

  if (!orderId) {
    console.error('checkout.session.completed (products) sem orderId:', session.id)
    return NextResponse.json({ ok: true })
  }

  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null

  // `collected_information.shipping_details` é onde o endereço passou a ficar
  // nas versões recentes da API; `shipping_details` no topo é o campo antigo.
  // Ler os dois evita que uma troca de versão no painel do Stripe zere o
  // endereço sem ninguém perceber — e sem endereço o pedido não é despachável.
  type Entrega = {
    name?: string | null
    address?: {
      line1?: string | null
      line2?: string | null
      city?: string | null
      state?: string | null
      postal_code?: string | null
      country?: string | null
    } | null
  }
  const sessionAny = session as unknown as {
    collected_information?: { shipping_details?: Entrega | null }
    shipping_details?: Entrega | null
  }
  const entrega = sessionAny.collected_information?.shipping_details ?? sessionAny.shipping_details
  const endereco = entrega?.address

  const { error: orderError } = await supabase.rpc('confirm_product_order', {
    p_order_id: orderId,
    p_payment_intent_id: paymentIntentId,
    p_shipping: {
      name: entrega?.name ?? null,
      line1: endereco?.line1 ?? null,
      line2: endereco?.line2 ?? null,
      city: endereco?.city ?? null,
      state: endereco?.state ?? null,
      postal_code: endereco?.postal_code ?? null,
      country: endereco?.country ?? null,
    },
  })

  if (orderError) {
    console.error('Order error:', orderError)
    return NextResponse.json({ error: 'Order failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
