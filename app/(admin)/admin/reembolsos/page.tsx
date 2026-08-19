import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, REEMBOLSO_AUTO_PROGRESSO_MAX } from '@/lib/utils'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel, SectionHeading } from '@/components/ui/panel'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { RefundActions } from '@/components/admin/RefundActions'
import { RotateCcw } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Reembolsos' }

/**
 * Fila de reembolso (decisão 2.1). Só chega aqui quem passou de
 * {REEMBOLSO_AUTO_PROGRESSO_MAX}% do curso — abaixo disso a devolução sai
 * sozinha e a matrícula já aparece resolvida no histórico de baixo.
 */
export default async function AdminRefundsPage() {
  const supabase = await createClient()

  const select = '*, course:courses(title), student:profiles(name)'

  const [{ data: pendentes }, { data: resolvidos }] = await Promise.all([
    supabase
      .from('enrollments')
      .select(select)
      .eq('refund_status', 'requested')
      .order('refund_requested_at', { ascending: true }),
    supabase
      .from('enrollments')
      .select(select)
      .in('refund_status', ['refunded', 'rejected', 'chargeback'])
      .order('refunded_at', { ascending: false })
      .limit(30),
  ])

  return (
    <>
      <PageHeader
        olho="Administração"
        titulo="Reembolsos"
        descricao={
          pendentes && pendentes.length > 0
            ? `${pendentes.length} ${pendentes.length === 1 ? 'pedido aguardando' : 'pedidos aguardando'} análise`
            : 'Nenhum pedido aguardando análise'
        }
      />

      <PageBody>
        {!pendentes || pendentes.length === 0 ? (
          <EmptyState
            icon={RotateCcw}
            titulo="Nada na fila"
            descricao={`Pedidos com até ${REEMBOLSO_AUTO_PROGRESSO_MAX}% do curso assistido são devolvidos automaticamente e nem passam por aqui.`}
          />
        ) : (
          <Panel className="overflow-hidden">
            <SectionHeading titulo="Aguardando decisão" className="border-b border-cobalto/10 px-4 py-3" />
            <ul className="divide-y divide-cobalto/10">
              {pendentes.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                  <div className="min-w-0 flex-1 basis-64">
                    <p className="truncate text-sm font-medium text-tinta">
                      {(e.course as any)?.title ?? '—'}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-tinta-suave/70">
                      {(e.student as any)?.name ?? '—'} · {formatCurrency(e.amount_paid ?? 0)} · pedido em{' '}
                      {e.refund_requested_at
                        ? new Date(e.refund_requested_at).toLocaleDateString('pt-BR')
                        : '—'}
                    </p>
                    {e.refund_reason && (
                      <p className="mt-1.5 text-xs italic text-tinta-suave">“{e.refund_reason}”</p>
                    )}
                  </div>
                  <RefundActions enrollmentId={e.id} />
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {resolvidos && resolvidos.length > 0 && (
          <Panel className="mt-6 overflow-hidden">
            <SectionHeading titulo="Histórico" className="border-b border-cobalto/10 px-4 py-3" />
            <ul className="divide-y divide-cobalto/10">
              {resolvidos.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate text-sm text-tinta">{(e.course as any)?.title ?? '—'}</p>
                    <p className="mt-0.5 truncate text-xs text-tinta-suave/70">
                      {(e.student as any)?.name ?? '—'} ·{' '}
                      {e.refunded_at ? new Date(e.refunded_at).toLocaleDateString('pt-BR') : '—'}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-tinta">
                    {formatCurrency(e.refund_amount ?? 0)}
                  </span>
                  <StatusBadge tipo="reembolso" status={e.refund_status} />
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </PageBody>
    </>
  )
}
