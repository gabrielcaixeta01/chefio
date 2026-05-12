import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import type { CartItem } from '@/contexts/CartContext'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe não configurado' }, { status: 503 })
  }

  const { items } = await req.json() as { items: CartItem[] }
  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: items.map((item) => ({
      price_data: {
        currency: 'brl',
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    })),
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
