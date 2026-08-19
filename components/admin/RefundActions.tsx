'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'

/**
 * Aprovar ou recusar um pedido que passou dos 30% assistidos (decisão 2.1).
 * Passa pela rota e não direto pelo Supabase porque aprovar mexe no gateway
 * e lança o estorno contra o professor — nada disso cabe no client.
 */
export function RefundActions({ enrollmentId }: { enrollmentId: string }) {
  const [carregando, setCarregando] = useState<'aprovar' | 'recusar' | null>(null)
  const router = useRouter()

  async function decidir(decisao: 'aprovar' | 'recusar') {
    if (decisao === 'recusar' && !confirm('Recusar o reembolso? O aluno mantém o acesso ao curso.')) return
    if (decisao === 'aprovar' && !confirm('Aprovar? O valor volta pro aluno, o acesso cai na hora e o repasse do professor é descontado.')) return

    setCarregando(decisao)
    try {
      const res = await fetch('/api/admin/reembolso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId, decisao }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.erro ?? 'Não foi possível concluir.')
        return
      }
      toast.success(decisao === 'aprovar' ? 'Reembolso feito.' : 'Pedido recusado.')
      router.refresh()
    } catch {
      toast.error('Não foi possível concluir.')
    } finally {
      setCarregando(null)
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        className="gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        disabled={carregando !== null}
        onClick={() => decidir('aprovar')}
      >
        <Check className="h-3.5 w-3.5" />
        {carregando === 'aprovar' ? '...' : 'Reembolsar'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="gap-1 border-red-200 text-red-600 hover:bg-red-50"
        disabled={carregando !== null}
        onClick={() => decidir('recusar')}
      >
        <X className="h-3.5 w-3.5" />
        {carregando === 'recusar' ? '...' : 'Recusar'}
      </Button>
    </div>
  )
}
