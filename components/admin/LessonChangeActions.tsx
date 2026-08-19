'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'

/**
 * Aprovar ou recusar a mudança que o professor pediu numa aula já vendida
 * (decisão 3.4). Passa pela rota porque aplicar a mudança precisa de service
 * role — o trigger do banco recusa a remoção e a troca vindas de um usuário.
 */
export function LessonChangeActions({
  requestId,
  tipo,
}: {
  requestId: string
  tipo: 'remove' | 'replace_video'
}) {
  const [carregando, setCarregando] = useState<'aprovar' | 'recusar' | null>(null)
  const router = useRouter()

  async function decidir(decisao: 'aprovar' | 'recusar') {
    const aviso =
      decisao === 'recusar'
        ? 'Recusar? A aula continua exatamente como está.'
        : tipo === 'remove'
          ? 'Aprovar a remoção? A aula sai do curso e o progresso dos alunos nela é perdido.'
          : 'Aprovar a troca? O vídeo novo entra no lugar do atual para todos os alunos.'
    if (!confirm(aviso)) return

    setCarregando(decisao)
    try {
      const res = await fetch('/api/admin/alteracao-aula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, decisao }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.erro ?? 'Não foi possível concluir.')
        return
      }
      toast.success(decisao === 'aprovar' ? 'Mudança aplicada.' : 'Pedido recusado.')
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
