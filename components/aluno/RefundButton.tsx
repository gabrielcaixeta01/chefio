'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { REEMBOLSO_PRAZO_DIAS } from '@/lib/utils'

interface RefundButtonProps {
  enrollmentId: string
  /** Dias que ainda restam da janela do CDC — só pra dizer isso pra pessoa. */
  diasRestantes: number
}

/**
 * Pedido de reembolso do aluno (decisão 2.1). A resposta da rota diz se o
 * dinheiro voltou na hora ou se o caso foi pra análise — o corte é o quanto
 * do curso já foi assistido, e quem decide isso é o servidor.
 */
export function RefundButton({ enrollmentId, diasRestantes }: RefundButtonProps) {
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const router = useRouter()

  async function enviar() {
    setEnviando(true)
    try {
      const res = await fetch('/api/reembolso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId, motivo }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.erro ?? 'Não foi possível pedir o reembolso.')
        return
      }

      if (data.status === 'refunded') {
        toast.success('Reembolso feito. O valor volta pro seu cartão em até 10 dias.')
      } else {
        toast.success('Pedido enviado. Vamos analisar e responder em até 2 dias úteis.')
      }
      setAberto(false)
      router.refresh()
    } catch {
      toast.error('Não foi possível pedir o reembolso. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-xs font-medium text-tinta-suave/70 underline underline-offset-2 hover:text-tinta"
      >
        Pedir reembolso ({diasRestantes === 1 ? 'último dia' : `${diasRestantes} dias restantes`})
      </button>
    )
  }

  return (
    <div className="rounded-md border border-cobalto/15 bg-cal-fundo p-4">
      <p className="text-sm font-semibold text-tinta">Pedir reembolso</p>
      <p className="mt-1 text-xs text-tinta-suave">
        Você tem {REEMBOLSO_PRAZO_DIAS} dias corridos desde a compra. Se ainda assistiu pouco do
        curso, o valor volta na hora e o acesso é encerrado.
      </p>
      <Textarea
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Conta pra gente o motivo (opcional)"
        rows={3}
        className="mt-3"
      />
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={enviar} disabled={enviando}>
          {enviando ? 'Enviando...' : 'Confirmar pedido'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAberto(false)} disabled={enviando}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
