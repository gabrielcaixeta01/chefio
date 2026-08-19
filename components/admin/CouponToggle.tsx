'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

/**
 * Desligar um cupom em vez de apagar: as matrículas que já usaram apontam
 * pra ele, e é por aí que dá pra medir se a promoção valeu a pena.
 */
export function CouponToggle({ couponId, active }: { couponId: string; active: boolean }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function alternar() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('coupons').update({ active: !active }).eq('id', couponId)

    if (error) toast.error('Erro ao atualizar cupom.')
    else {
      toast.success(active ? 'Cupom desativado.' : 'Cupom reativado.')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={loading}
      onClick={alternar}
      className={active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}
    >
      {loading ? '...' : active ? 'Desativar' : 'Reativar'}
    </Button>
  )
}
