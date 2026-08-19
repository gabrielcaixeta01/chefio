'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Truck, PackageCheck } from 'lucide-react'
import type { OrderStatus } from '@/types/database'

interface OrderStatusActionsProps {
  orderId: string
  status: OrderStatus
  trackingCode?: string | null
}

export function OrderStatusActions({ orderId, status, trackingCode }: OrderStatusActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function advance(nextStatus: OrderStatus) {
    const patch: { status: OrderStatus; tracking_code?: string } = { status: nextStatus }

    // Decisão 8.3: o despacho é de fornecedor terceirizado, então o código de
    // rastreio é a única coisa que o aluno tem pra saber onde a encomenda
    // está. O banco recusa 'shipped' sem ele — isto aqui só evita que o admin
    // descubra a regra por uma mensagem de erro.
    if (nextStatus === 'shipped') {
      const codigo = prompt('Código de rastreio da encomenda:', trackingCode ?? '')
      if (codigo === null) return
      if (!codigo.trim()) {
        toast.error('Sem o código o aluno não consegue acompanhar a entrega.')
        return
      }
      patch.tracking_code = codigo.trim()
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('orders').update(patch).eq('id', orderId)

    if (error) {
      toast.error(
        error.message.includes('rastreio')
          ? 'Informe o código de rastreio antes de marcar como enviado.'
          : 'Erro ao atualizar pedido.'
      )
    } else {
      toast.success(nextStatus === 'shipped' ? 'Pedido marcado como enviado.' : 'Pedido marcado como entregue.')
      router.refresh()
    }
    setLoading(false)
  }

  if (status === 'paid') {
    return (
      <Button size="sm" variant="outline" className="gap-1.5" disabled={loading} onClick={() => advance('shipped')}>
        <Truck className="h-3.5 w-3.5" />
        {loading ? '...' : 'Marcar como enviado'}
      </Button>
    )
  }

  if (status === 'shipped') {
    return (
      <Button size="sm" variant="outline" className="gap-1.5" disabled={loading} onClick={() => advance('delivered')}>
        <PackageCheck className="h-3.5 w-3.5" />
        {loading ? '...' : 'Marcar como entregue'}
      </Button>
    )
  }

  return null
}
