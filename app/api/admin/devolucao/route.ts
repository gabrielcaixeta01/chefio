import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { getAuthedUser, roleFromUser } from '@/lib/auth/session'

/**
 * Decisão do admin sobre uma devolução de produto (decisão 8.6).
 *
 * Aprovar devolve o dinheiro no gateway e estorna a comissão do professor
 * pelos itens que tinham vindo da página de uma aula (8.4); recusar só fecha
 * o pedido com a justificativa. O valor devolvido inclui o frete: quando a
 * devolução é aceita, quem pagou pra receber não fica no prejuízo.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthedUser()
  const role = roleFromUser(user)
  if (role !== 'admin' && role !== 'owner') {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 403 })
  }

  const { orderId, decisao, nota } = await req.json().catch(() => ({}))
  if (!orderId || (decisao !== 'aprovar' && decisao !== 'recusar')) {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: order } = await admin
    .from('orders')
    .select('id, total, stripe_payment_intent_id, return_status')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) {
    return NextResponse.json({ erro: 'Pedido não encontrado.' }, { status: 404 })
  }
  if (order.return_status !== 'requested') {
    return NextResponse.json({ erro: 'Esta devolução já foi resolvida.' }, { status: 409 })
  }

  if (decisao === 'recusar') {
    const { error } = await admin.rpc('resolve_product_return', {
      p_order_id: orderId,
      p_aprovar: false,
      p_note: nota ?? null,
    })
    if (error) {
      return NextResponse.json({ erro: 'Não foi possível registrar a recusa.' }, { status: 500 })
    }
    await admin.from('orders').update({ return_reviewed_by: user!.id }).eq('id', orderId)
    return NextResponse.json({ status: 'rejected' })
  }

  const valor = Number(order.total ?? 0)

  if (valor > 0 && order.stripe_payment_intent_id) {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ erro: 'Gateway de pagamento não configurado.' }, { status: 503 })
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    try {
      await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id })
    } catch (e) {
      // Mesmo tratamento do reembolso de curso: se o dinheiro já voltou (dois
      // cliques, ou estorno feito pelo painel do Stripe), segue pra fechar o
      // pedido em vez de travar.
      const code = (e as { code?: string })?.code
      if (code !== 'charge_already_refunded') {
        console.error('Refund produto error:', e)
        return NextResponse.json({ erro: 'O gateway recusou o estorno.' }, { status: 502 })
      }
    }
  }

  const { error } = await admin.rpc('resolve_product_return', {
    p_order_id: orderId,
    p_aprovar: true,
    p_amount: valor,
    p_note: nota ?? null,
  })

  if (error) {
    // O dinheiro já voltou pro aluno neste ponto — sem o log não sobra rastro
    // de que o pedido ficou aberto indevidamente.
    console.error('resolve_product_return error:', error, 'order:', orderId)
    return NextResponse.json(
      { erro: 'Estorno feito no gateway, mas o pedido não foi baixado.' },
      { status: 500 }
    )
  }

  await admin.from('orders').update({ return_reviewed_by: user!.id }).eq('id', orderId)
  return NextResponse.json({ status: 'refunded' })
}
