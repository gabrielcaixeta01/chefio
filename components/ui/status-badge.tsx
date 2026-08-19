import { Badge, type BadgeProps } from '@/components/ui/badge'

/**
 * Pílula de status — um lugar só pra dizer o que cada estado significa.
 *
 * Antes cada página escrevia a própria: a mesma string de classe
 * (`rounded-sm px-2.5 py-1 text-[0.6875rem] uppercase tracking-[0.08em]`)
 * repetida em oito arquivos, e quatro tabelas de rótulo divergentes — o mesmo
 * `pending` era "Pendente" num lugar e "Aguardando pagamento" no outro, e
 * `paid` mudava de cinza pra cobalto dependendo da tela.
 *
 * A cor carrega significado e não muda por tipo: verde é terminal e bom,
 * âmbar é "esperando alguém", vermelho é falha, cinza é morno, cobalto é
 * trânsito.
 */

type Tom = NonNullable<BadgeProps['variant']>
type Entrada = { label: string; tom: Tom }

const CURSO = {
  draft: { label: 'Rascunho', tom: 'neutral' },
  pending_review: { label: 'Em revisão', tom: 'warning' },
  approved: { label: 'Publicado', tom: 'success' },
  rejected: { label: 'Rejeitado', tom: 'destructive' },
} satisfies Record<string, Entrada>

const PEDIDO = {
  pending: { label: 'Aguardando pagamento', tom: 'warning' },
  paid: { label: 'Pago', tom: 'info' },
  shipped: { label: 'Enviado', tom: 'info' },
  delivered: { label: 'Entregue', tom: 'success' },
} satisfies Record<string, Entrada>

const REPASSE = {
  pending: { label: 'Pendente', tom: 'warning' },
  paid: { label: 'Pago', tom: 'success' },
  failed: { label: 'Falhou', tom: 'destructive' },
} satisfies Record<string, Entrada>

const PROFESSOR = {
  pending: { label: 'Pendente', tom: 'warning' },
  active: { label: 'Ativo', tom: 'success' },
  suspended: { label: 'Suspenso', tom: 'destructive' },
} satisfies Record<string, Entrada>

const REEMBOLSO = {
  none: { label: 'Normal', tom: 'neutral' },
  requested: { label: 'Em análise', tom: 'warning' },
  refunded: { label: 'Reembolsado', tom: 'info' },
  rejected: { label: 'Recusado', tom: 'destructive' },
  chargeback: { label: 'Chargeback', tom: 'destructive' },
} satisfies Record<string, Entrada>

const MAPAS = {
  curso: CURSO,
  pedido: PEDIDO,
  repasse: REPASSE,
  professor: PROFESSOR,
  reembolso: REEMBOLSO,
} satisfies Record<string, Record<string, Entrada>>

type Tipo = keyof typeof MAPAS

/** Rótulo cru — pra quando a página precisa do texto sem a pílula. */
export function statusLabel(tipo: Tipo, status: string | null | undefined): string {
  return (MAPAS[tipo] as Record<string, Entrada>)[status ?? '']?.label ?? status ?? '—'
}

export function StatusBadge({
  tipo,
  status,
  /** Troca o rótulo padrão sem perder a cor — o admin lê `approved` como
      "Aprovado" (ele aprovou), o professor lê como "Publicado" (está no ar). */
  label,
  className,
}: {
  tipo: Tipo
  status: string | null | undefined
  label?: string
  className?: string
}) {
  const entrada = (MAPAS[tipo] as Record<string, Entrada>)[status ?? '']

  return (
    <Badge variant={entrada?.tom ?? 'neutral'} className={className}>
      {label ?? entrada?.label ?? status ?? '—'}
    </Badge>
  )
}
