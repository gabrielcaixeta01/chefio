'use client'

import { useState } from 'react'
import { useCart } from '@/contexts/CartContext'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Check } from 'lucide-react'

interface Product {
  id: string
  name: string
  price: number
  image_url: string | null
}

/**
 * `lessonId` marca de onde a pessoa clicou (decisão 8.4): produto adicionado
 * pela página de uma aula gera comissão pro professor daquele curso; o mesmo
 * produto adicionado pela aba Loja, não.
 */
export function AddToCartButton({
  product,
  lessonId,
}: {
  product: Product
  lessonId?: string | null
}) {
  const { add } = useCart()
  const [added, setAdded] = useState(false)

  function handleAdd() {
    add({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      lessonId: lessonId ?? null,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <Button size="sm" variant={added ? 'outline' : 'default'} onClick={handleAdd} className="gap-1.5">
      {added ? (
        <><Check className="h-3.5 w-3.5 text-emerald-600" /> Adicionado</>
      ) : (
        <><ShoppingCart className="h-3.5 w-3.5" /> Adicionar</>
      )}
    </Button>
  )
}
