'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { DEVOLUCAO_PRAZO_DIAS } from '@/lib/utils'

interface ReturnRequestButtonProps {
  orderId: string
  /** Dias que ainda restam da janela do CDC. `null` = ainda não foi entregue. */
  diasRestantes: number | null
}

/**
 * Pedido de troca ou devolução de produto físico (decisão 8.6). O prazo
 * conta do recebimento, não da compra — enquanto o pedido não foi marcado
 * como entregue a janela nem começou, e o botão diz isso em vez de mostrar
 * uma contagem que não existe.
 */
export function ReturnRequestButton({ orderId, diasRestantes }: ReturnRequestButtonProps) {
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const router = useRouter()

  async function enviar() {
    setEnviando(true)
    try {
      const res = await fetch('/api/devolucao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, motivo }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.erro ?? 'Não foi possível pedir a devolução.')
        return
      }

      toast.success('Pedido enviado. Vamos combinar a coleta e responder em até 2 dias úteis.')
      setAberto(false)
      router.refresh()
    } catch {
      toast.error('Não foi possível pedir a devolução. Tente de novo.')
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
        {diasRestantes === null
          ? 'Trocar ou devolver'
          : diasRestantes === 1
            ? 'Trocar ou devolver (último dia)'
            : `Trocar ou devolver (${diasRestantes} dias restantes)`}
      </button>
    )
  }

  return (
    <div className="mt-3 rounded-md border border-cobalto/15 bg-cal-fundo p-4">
      <p className="text-sm font-semibold text-tinta">Trocar ou devolver</p>
      <p className="mt-1 text-xs leading-relaxed text-tinta-suave">
        Você tem {DEVOLUCAO_PRAZO_DIAS} dias a partir do recebimento, sem precisar justificar. O
        produto precisa voltar em condições de revenda — a gente combina a coleta com você e o
        valor volta pelo mesmo pagamento.
      </p>
      <Textarea
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Conta pra gente o que aconteceu (opcional)"
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
