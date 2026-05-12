'use client'

import { useState } from 'react'
import { useCart } from '@/contexts/CartContext'
import { formatCurrency } from '@/lib/utils'
import { ShoppingCart, X, Plus, Minus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function CartButton() {
  const { count } = useCart()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative p-2 text-gray-600 hover:text-orange-600 transition-colors"
      >
        <ShoppingCart className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && <CartDrawer onClose={() => setOpen(false)} />}
    </>
  )
}

function CartDrawer({ onClose }: { onClose: () => void }) {
  const { items, remove, updateQty, total, clear } = useCart()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleCheckout() {
    if (items.length === 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao processar pedido.')
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Carrinho</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Seu carrinho está vazio
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-orange-50" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-orange-600 font-semibold">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => updateQty(item.id, item.quantity - 1)} className="p-1 text-gray-400 hover:text-gray-700">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, item.quantity + 1)} className="p-1 text-gray-400 hover:text-gray-700">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => remove(item.id)} className="p-1 text-gray-400 hover:text-red-500 ml-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
              </div>
              <Button className="w-full" onClick={handleCheckout} disabled={loading}>
                {loading ? 'Redirecionando...' : 'Finalizar pedido'}
              </Button>
              <button onClick={clear} className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Limpar carrinho
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
