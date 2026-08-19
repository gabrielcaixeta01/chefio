'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

/**
 * Recusa de um pedido de cadastro de produto (decisão 8.5). Aprovar não passa
 * por aqui: aprovar é cadastrar o produto, e isso acontece no formulário ao
 * lado — que baixa o pedido no mesmo salvamento.
 */
export function ProductRequestActions({ requestId }: { requestId: string }) {
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()

  async function recusar() {
    const nota = prompt('Por que este produto não entra no catálogo? (o professor lê este texto)')
    if (nota === null) return
    if (!nota.trim()) {
      toast.error('Escreva o motivo — é o que o professor vai ler.')
      return
    }

    setCarregando(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('product_requests')
      .update({ status: 'rejected', review_note: nota.trim() })
      .eq('id', requestId)

    if (error) toast.error('Não foi possível recusar o pedido.')
    else {
      toast.success('Pedido recusado.')
      router.refresh()
    }
    setCarregando(false)
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1 border-red-200 text-red-600 hover:bg-red-50"
      disabled={carregando}
      onClick={recusar}
    >
      <X className="h-3.5 w-3.5" />
      {carregando ? '...' : 'Recusar'}
    </Button>
  )
}
