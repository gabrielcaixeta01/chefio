'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'

/**
 * Aprovar ou recusar uma devolução de produto (decisão 8.6). Passa pela rota
 * e não direto pelo Supabase porque aprovar mexe no gateway e estorna a
 * comissão do professor — nada disso cabe no client.
 */
export function ReturnActions({ orderId }: { orderId: string }) {
  const [carregando, setCarregando] = useState<'aprovar' | 'recusar' | null>(null)
  const router = useRouter()

  async function decidir(decisao: 'aprovar' | 'recusar') {
    if (decisao === 'recusar' && !confirm('Recusar a devolução? Escreva o motivo em seguida — o aluno lê.')) return
    if (decisao === 'aprovar' && !confirm('Aprovar? O valor do pedido, incluindo frete, volta pro aluno e a comissão do professor é estornada.')) return

    const nota = prompt(
      decisao === 'recusar'
        ? 'Por que a devolução foi recusada? (o aluno lê este texto)'
        : 'Alguma observação sobre a coleta? (opcional)'
    )
    if (nota === null) return
    if (decisao === 'recusar' && !nota.trim()) {
      toast.error('Escreva o motivo — é o que o aluno vai ler.')
      return
    }

    setCarregando(decisao)
    try {
      const res = await fetch('/api/admin/devolucao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, decisao, nota: nota.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.erro ?? 'Não foi possível concluir.')
        return
      }
      toast.success(decisao === 'aprovar' ? 'Devolução aprovada e valor estornado.' : 'Devolução recusada.')
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
        {carregando === 'aprovar' ? '...' : 'Aprovar'}
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
