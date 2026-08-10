import type { LucideIcon } from 'lucide-react'
import { Ladrilho } from '@/components/ui/ladrilho'

/**
 * Tela vazia. Contorno tracejado em vez de caixa cheia: o lugar existe, só não
 * tem nada assentado ainda — mesma leitura que a home usa quando o catálogo
 * está vazio. Título em display, e sempre uma saída clara.
 */
export function EmptyState({
  icon: Icon,
  titulo,
  descricao,
  acao,
}: {
  icon: LucideIcon
  titulo: string
  descricao?: React.ReactNode
  acao?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-6 rounded-md border border-dashed border-cobalto/30 bg-cal/50 p-8 sm:flex-row sm:items-center sm:p-10">
      <Ladrilho tom="cobalto" tamanho="lg">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </Ladrilho>
      <div className="min-w-0 flex-1">
        <p className="font-display text-xl font-bold tracking-tight text-tinta">{titulo}</p>
        {descricao && <p className="mt-1.5 max-w-md text-sm leading-relaxed text-tinta-suave">{descricao}</p>}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </div>
  )
}
