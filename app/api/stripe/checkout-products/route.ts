import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

type CartRequestItem = { id: string; quantity: number }

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe não configurado' }, { status: 503 })
  }

  let items: CartRequestItem[]
  try {
    ({ items } = (await req.json()) as { items: CartRequestItem[] })
  } catch {
    return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 })
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 })
  }

  // O mesmo produto pode chegar em duas linhas do carrinho. Sem somar antes,
  // cada linha passava sozinha na checagem de estoque e o total pedido podia
  // superar o saldo (2 linhas de 3 unidades com 4 em estoque).
  const quantidadePorProduto = new Map<string, number>()
  for (const item of items) {
    const quantity = Math.floor(Number(item.quantity))
    if (!item?.id || !Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json({ error: 'Produto inválido' }, { status: 400 })
    }
    quantidadePorProduto.set(item.id, (quantidadePorProduto.get(item.id) ?? 0) + quantity)
  }

  // Preço, nome e estoque vêm sempre do banco — nunca do request.
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, stock')
    .in('id', [...quantidadePorProduto.keys()])
    .eq('is_active', true)

  const productById = new Map((products ?? []).map((p) => [p.id, p]))

  const lineItems: NonNullable<Stripe.Checkout.SessionCreateParams['line_items']> = []
  for (const [productId, quantity] of quantidadePorProduto) {
    const product = productById.get(productId)
    if (!product) {
      return NextResponse.json({ error: 'Produto inválido' }, { status: 400 })
    }
    if (quantity > product.stock) {
      return NextResponse.json({ error: `Estoque insuficiente para ${product.name}` }, { status: 400 })
    }
    lineItems.push({
      price_data: {
        currency: 'brl',
        product_data: { name: product.name },
        unit_amount: Math.round(product.price * 100),
      },
      quantity,
    })
  }

  // Metadata do Stripe tem teto de 500 caracteres por valor. Cada par
  // "<uuid>:<qtd>," come ~40, então o carrinho estoura por volta de 12 itens
  // distintos — e o erro apareceria como 500 genérico na hora de pagar.
  const itemsSummary = [...quantidadePorProduto]
    .map(([id, qtd]) => `${id}:${qtd}`)
    .join(',')

  if (itemsSummary.length > 500) {
    return NextResponse.json(
      { error: 'Carrinho grande demais. Finalize em pedidos menores (até 12 produtos diferentes).' },
      { status: 400 }
    )
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    metadata: {
      studentId: user.id,
      type: 'products',
      itemsSummary,
    },
    success_url: `${appUrl}/aluno/pedidos?success=true`,
    cancel_url: `${appUrl}/aluno/loja`,
  })

  return NextResponse.json({ url: session.url })
}
