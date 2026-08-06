'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Truck, PackageCheck } from 'lucide-react'
import type { Database } from '@/types/database'

type OrderStatus = Database['public']['Tables']['orders']['Row']['status']

interface OrderStatusActionsProps {
  orderId: string
  status: OrderStatus
}

export function OrderStatusActions({ orderId, status }: OrderStatusActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function advance(nextStatus: OrderStatus) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', orderId)

    if (error) {
      toast.error('Erro ao atualizar pedido.')
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
