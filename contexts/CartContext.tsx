'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export interface CartItem {
  id: string
  name: string
  price: number
  image_url: string | null
  quantity: number
  /**
   * Aula de onde o produto foi adicionado (decisão 8.4). Nulo quando veio da
   * aba Loja — e é essa diferença que decide se o professor ganha comissão,
   * então o mesmo produto pode ocupar duas linhas do carrinho.
   */
  lessonId?: string | null
}

/** Produto + origem. É a identidade real de uma linha do carrinho. */
export function chaveItem(item: { id: string; lessonId?: string | null }): string {
  return `${item.id}:${item.lessonId ?? ''}`
}

interface CartContextValue {
  items: CartItem[]
  add: (item: Omit<CartItem, 'quantity'>) => void
  remove: (chave: string) => void
  updateQty: (chave: string, qty: number) => void
  clear: () => void
  total: number
  count: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('chefio_cart')
      if (saved) setItems(JSON.parse(saved))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem('chefio_cart', JSON.stringify(items))
  }, [items, hydrated])

  function add(item: Omit<CartItem, 'quantity'>) {
    const chave = chaveItem(item)
    setItems((prev) => {
      const existing = prev.find((i) => chaveItem(i) === chave)
      if (existing) {
        return prev.map((i) => (chaveItem(i) === chave ? { ...i, quantity: i.quantity + 1 } : i))
      }
      return [...prev, { ...item, lessonId: item.lessonId ?? null, quantity: 1 }]
    })
  }

  function remove(chave: string) {
    setItems((prev) => prev.filter((i) => chaveItem(i) !== chave))
  }

  function updateQty(chave: string, qty: number) {
    if (qty <= 0) return remove(chave)
    setItems((prev) => prev.map((i) => (chaveItem(i) === chave ? { ...i, quantity: qty } : i)))
  }

  function clear() {
    setItems([])
  }

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const count = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, add, remove, updateQty, clear, total, count }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
