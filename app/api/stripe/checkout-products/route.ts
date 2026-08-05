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

  const { items } = await req.json() as { items: CartRequestItem[] }
  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 })
  }

  // Preço, nome e estoque vêm sempre do banco — nunca do request.
  const ids = items.map((i) => i.id)
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, stock')
    .in('id', ids)
    .eq('is_active', true)

  const productById = new Map((products ?? []).map((p) => [p.id, p]))

  const lineItems: NonNullable<Stripe.Checkout.SessionCreateParams['line_items']> = []
  for (const item of items) {
    const product = productById.get(item.id)
    const quantity = Math.floor(item.quantity)
    if (!product || !Number.isFinite(quantity) || quantity < 1) {
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

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    metadata: {
      studentId: user.id,
      type: 'products',
      itemsSummary: items.map((i) => `${i.id}:${i.quantity}`).join(','),
    },
    success_url: `${appUrl}/aluno/pedidos?success=true`,
    cancel_url: `${appUrl}/aluno/loja`,
  })

  return NextResponse.json({ url: session.url })
}
