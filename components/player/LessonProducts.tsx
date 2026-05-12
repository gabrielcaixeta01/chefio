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
        <ShoppingBag className="h-4 w-4 text-orange-500" />
        <h3 className="font-semibold text-gray-900 text-sm">Produtos desta aula</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl"
          >
            <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-orange-50 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-orange-300" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
              <p className="text-xs text-orange-600 font-semibold">{formatCurrency(product.price)}</p>
            </div>
            <AddToCartButton product={product} />
          </div>
        ))}
      </div>
    </div>
  )
}
