import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cotarFrete, normalizarCep } from '@/lib/frete'

type CartRequestItem = { id: string; quantity: number; lessonId?: string | null }

/**
 * Checkout da loja (decisões 8.1, 8.2, 8.4).
 *
 * O pedido nasce aqui, em 'pending', antes de a pessoa ver a tela do Stripe.
 * Antes ele era remontado no webhook a partir de um resumo `"<uuid>:<qtd>"`
 * na metadata — que estourava o teto de 500 caracteres com ~12 produtos e não
 * tinha onde caber frete nem a aula que originou cada item. Agora a metadata
 * leva só o id do pedido.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe não configurado' }, { status: 503 })
  }

  let items: CartRequestItem[]
  let cep: string
  try {
    const body = (await req.json()) as { items: CartRequestItem[]; cep?: string }
    items = body.items
    cep = normalizarCep(body.cep ?? '')
  } catch {
    return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 })
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 })
  }

  // Decisão 8.2: sem CEP não há frete, e sem frete não há total. O carrinho
  // já bloqueia o botão, mas o valor não pode depender só disso.
  if (cep.length !== 8) {
    return NextResponse.json({ error: 'Informe um CEP válido para calcular o frete.' }, { status: 400 })
  }

  // O mesmo produto pode chegar em duas linhas do carrinho — uma da aba Loja
  // e outra da página de uma aula. Elas não se somam: a origem é o que decide
  // se o professor ganha comissão (8.4), então cada linha vira um item.
  const linhas: { product_id: string; quantity: number; lesson_id: string | null }[] = []
  let totalUnidades = 0
  for (const item of items) {
    const quantity = Math.floor(Number(item.quantity))
    if (!item?.id || !Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json({ error: 'Produto inválido' }, { status: 400 })
    }
    linhas.push({ product_id: item.id, quantity, lesson_id: item.lessonId || null })
    totalUnidades += quantity
  }

  const frete = cotarFrete(cep, totalUnidades)
  if (!frete) {
    return NextResponse.json({ error: 'Não foi possível calcular o frete para este CEP.' }, { status: 400 })
  }

  // Preço, estoque e a comissão do professor são resolvidos dentro da função,
  // com a linha do produto travada. O cliente manda id e quantidade, nada mais.
  const admin = createAdminClient()
  const { data: criado, error: pedidoError } = await admin.rpc('create_pending_order', {
    p_student_id: user.id,
    p_items: linhas,
    p_postal_code: cep,
    p_shipping_cost: frete.valor,
    p_shipping_days: frete.dias,
  })

  if (pedidoError || !criado?.[0]?.order_id) {
    // As mensagens do raise já vêm prontas ("Estoque insuficiente para X").
    return NextResponse.json(
      { error: pedidoError?.message ?? 'Não foi possível montar o pedido.' },
      { status: 400 }
    )
  }

  const orderId = criado[0].order_id

  const { data: itensGravados } = await admin
    .from('order_items')
    .select('quantity, unit_price, product:products(name)')
    .eq('order_id', orderId)

  const lineItems: NonNullable<Stripe.Checkout.SessionCreateParams['line_items']> = (
    itensGravados ?? []
  ).map((item) => ({
    price_data: {
      currency: 'brl',
      product_data: { name: (item.product as any)?.name ?? 'Produto' },
      unit_amount: Math.round(Number(item.unit_price) * 100),
    },
    quantity: item.quantity,
  }))

  if (lineItems.length === 0) {
    return NextResponse.json({ error: 'Pedido sem itens.' }, { status: 400 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    // Decisão 8.1: o endereço é coletado pelo próprio Stripe.
    // Decisão 8.7: só Brasil, e a tabela de frete cobre as nove faixas de CEP.
    shipping_address_collection: { allowed_countries: ['BR'] },
    // A cotação já foi feita pelo CEP que a pessoa digitou no carrinho. Aqui
    // ela vira uma linha fixa: o Stripe não recalcula frete pelo endereço.
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: Math.round(frete.valor * 100), currency: 'brl' },
          display_name: `Entrega — ${frete.regiao}`,
          delivery_estimate: {
            minimum: { unit: 'business_day', value: Math.max(1, frete.dias - 2) },
            maximum: { unit: 'business_day', value: frete.dias },
          },
        },
      },
    ],
    metadata: { type: 'products', orderId },
    success_url: `${appUrl}/aluno/pedidos?success=true`,
    cancel_url: `${appUrl}/aluno/loja`,
  })

  return NextResponse.json({ url: session.url })
}
