'use client'

import { useEffect, useRef, useState } from 'react'
import { useCart } from '@/contexts/CartContext'
import { formatCurrency, cn } from '@/lib/utils'
import { ShoppingCart, X, Plus, Minus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function CartButton() {
  const { count } = useCart()
  const [open, setOpen] = useState(false)
  const gatilhoRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button
        ref={gatilhoRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        // O contador era só um número desenhado por cima do ícone: quem usa
        // leitor de tela ouvia "carrinho" e nada sobre o que tem dentro.
        aria-label={count > 0 ? `Carrinho — ${count} ${count === 1 ? 'item' : 'itens'}` : 'Carrinho vazio'}
        className="relative flex h-11 w-11 items-center justify-center rounded-sm text-tinta-suave transition-colors hover:bg-cobalto/10 hover:text-cobalto"
      >
        <ShoppingCart className="h-5 w-5" aria-hidden="true" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brasa px-1 text-[10px] font-bold tabular-nums text-tinta"
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && <CartDrawer onClose={() => setOpen(false)} gatilhoRef={gatilhoRef} />}
    </>
  )
}

function CartDrawer({
  onClose,
  gatilhoRef,
}: {
  onClose: () => void
  gatilhoRef: React.RefObject<HTMLButtonElement>
}) {
  const { items, remove, updateQty, total, clear } = useCart()
  const [loading, setLoading] = useState(false)
  const painelRef = useRef<HTMLDivElement>(null)

  // Mesmo tratamento da gaveta do menu: Escape fecha, o Tab não escapa pro
  // conteúdo atrás, a página não rola por baixo e o foco volta pro carrinho.
  // Era a única gaveta do site que não fazia nada disso.
  useEffect(() => {
    const painel = painelRef.current
    const gatilho = gatilhoRef.current

    function focaveis() {
      return Array.from(
        painel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])') ?? []
      )
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const itens = focaveis()
      if (itens.length === 0) return

      const primeiro = itens[0]
      const ultimo = itens[itens.length - 1]
      const ativo = document.activeElement

      if (e.shiftKey && (ativo === primeiro || !painel?.contains(ativo))) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && ativo === ultimo) {
        e.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    focaveis()[0]?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      gatilho?.focus()
    }
  }, [onClose, gatilhoRef])

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
      {/* Véu em cobalto escuro, como o da gaveta do menu — o preto puro era o
          único overlay do site fora da paleta. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-cobalto-escuro/70"
      />

      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-carrinho"
        className="vidrado fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-cobalto/15 bg-cal"
      >
        <div className="flex items-center justify-between border-b border-cobalto/10 px-4 py-3.5">
          <h2 id="titulo-carrinho" className="font-display text-lg font-bold tracking-tight text-tinta">
            Carrinho
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar carrinho"
            className="flex h-9 w-9 items-center justify-center rounded-sm text-tinta-suave transition-colors hover:bg-cobalto/10 hover:text-tinta"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <ShoppingCart className="h-8 w-8 text-cobalto/25" aria-hidden="true" />
            <p className="font-display text-lg font-bold tracking-tight text-tinta">
              Seu carrinho está vazio
            </p>
            <p className="text-sm text-tinta-suave">
              Os ingredientes e utensílios de cada aula ficam na loja.
            </p>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-cobalto/10 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-cobalto/10">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- imagem de produto pode vir de host arbitrário
                      <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-tinta">{item.name}</p>
                    <p className="text-xs font-semibold tabular-nums text-brasa-escura">
                      {formatCurrency(item.price)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <BotaoQtd
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      label={`Diminuir quantidade de ${item.name}`}
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    </BotaoQtd>
                    <span className="w-7 text-center text-sm tabular-nums text-tinta">
                      {item.quantity}
                    </span>
                    <BotaoQtd
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      label={`Aumentar quantidade de ${item.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </BotaoQtd>
                    <BotaoQtd
                      onClick={() => remove(item.id)}
                      label={`Remover ${item.name} do carrinho`}
                      className="ml-1 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </BotaoQtd>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 border-t border-cobalto/10 p-4">
              <div className="flex items-center justify-between">
                <span className="olho text-tinta-suave">Total</span>
                <span className="font-display text-xl font-extrabold tabular-nums tracking-tight text-tinta">
                  {formatCurrency(total)}
                </span>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                loading={loading}
                loadingText="Redirecionando…"
              >
                Finalizar pedido
              </Button>
              <button
                type="button"
                onClick={clear}
                className="w-full rounded-sm py-1.5 text-xs font-semibold text-tinta-suave/70 transition-colors hover:text-tinta-suave"
              >
                Limpar carrinho
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

/** Alvo de 36px nos controles de quantidade: os 22px de antes reprovavam em
    qualquer diretriz de toque e erravam feio num dedo. */
function BotaoQtd({
  onClick,
  label,
  className,
  children,
}: {
  onClick: () => void
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-sm text-tinta-suave transition-colors hover:bg-cobalto/10 hover:text-tinta',
        className
      )}
    >
      {children}
    </button>
  )
}
