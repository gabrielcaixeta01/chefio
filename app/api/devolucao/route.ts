import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Pedido de troca ou devolução do aluno (decisão 8.6).
 *
 * A validação que importa — dono do pedido, pedido pago, janela de 7 dias
 * contada da entrega, um pedido por compra — roda dentro de
 * `request_product_return`, com a sessão do aluno. Diferente do reembolso de
 * curso (2.1), aqui nada é automático: o produto físico precisa voltar antes
 * de o dinheiro sair.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })

  const { orderId, motivo } = await req.json().catch(() => ({}))
  if (!orderId) {
    return NextResponse.json({ erro: 'Pedido não informado.' }, { status: 400 })
  }

  const { error } = await supabase.rpc('request_product_return', {
    p_order_id: orderId,
    p_reason: motivo ?? '',
  })

  if (error) {
    // As mensagens do raise já vêm prontas ("O prazo de 7 dias...").
    return NextResponse.json({ erro: error.message }, { status: 400 })
  }

  return NextResponse.json({ status: 'requested' })
}
