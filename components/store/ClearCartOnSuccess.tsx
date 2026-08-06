'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'

/**
 * Pedido pago volta pra cá com ?success=true. Limpa o carrinho (localStorage)
 * e tira a query da URL — sem isso um refresh na página de pedidos não faz
 * nada de errado, mas um bookmark/compartilhamento do link apagaria um
 * carrinho novo formado depois da compra.
 */
export function ClearCartOnSuccess() {
  const { clear } = useCart()
  const router = useRouter()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true
    clear()
    router.replace('/aluno/pedidos')
  }, [clear, router])

  return null
}
