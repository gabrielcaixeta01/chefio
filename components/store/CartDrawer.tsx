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
        className="relative p-2 text-tinta-suave hover:text-brasa-escura transition-colors"
      >
        <ShoppingCart className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-brasa text-white text-[10px] font-bold rounded-full flex items-center justify-center">
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
        <div className="flex items-center justify-between p-4 border-b border-cobalto/10">
          <h2 className="font-semibold text-tinta">Carrinho</h2>
          <button onClick={onClose} className="p-1 text-tinta-suave/70 hover:text-tinta">
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-tinta-suave/70 text-sm">
            Seu carrinho está vazio
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-sm bg-cobalto/10 shrink-0 overflow-hidden">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-brasa/10" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-tinta truncate">{item.name}</p>
                    <p className="text-xs text-brasa-escura font-semibold">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => updateQty(item.id, item.quantity - 1)} className="p-1 text-tinta-suave/70 hover:text-tinta">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, item.quantity + 1)} className="p-1 text-tinta-suave/70 hover:text-tinta">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => remove(item.id)} className="p-1 text-tinta-suave/70 hover:text-red-600 ml-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-cobalto/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-tinta-suave">Total</span>
                <span className="font-bold text-tinta">{formatCurrency(total)}</span>
              </div>
              <Button className="w-full" onClick={handleCheckout} disabled={loading}>
                {loading ? 'Redirecionando...' : 'Finalizar pedido'}
              </Button>
              <button onClick={clear} className="w-full text-xs text-tinta-suave/70 hover:text-tinta-suave transition-colors">
                Limpar carrinho
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
