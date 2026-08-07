'use client'

import { useCart } from '@/contexts/CartContext'
import { formatCurrency } from '@/lib/utils'
import { AddToCartButton } from '@/components/store/AddToCartButton'
import { ShoppingBag } from 'lucide-react'

interface Product {
  id: string
  name: string
  price: number
  image_url: string | null
  description: string | null
}

export function LessonProducts({ products }: { products: Product[] }) {
  if (products.length === 0) return null

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingBag className="h-4 w-4 text-brasa-escura" />
        <h3 className="font-display font-bold text-tinta text-sm tracking-tight">Produtos desta aula</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-center gap-3 p-3 bg-cal border border-cobalto/15 rounded-md"
          >
            <div className="w-12 h-12 rounded-sm bg-cobalto/10 shrink-0 overflow-hidden">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-brasa/10 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-brasa-escura" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-tinta truncate">{product.name}</p>
              <p className="text-xs text-brasa-escura font-semibold">{formatCurrency(product.price)}</p>
            </div>
            <AddToCartButton product={product} />
          </div>
        ))}
      </div>
    </div>
  )
}
