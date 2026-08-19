import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel } from '@/components/ui/panel'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { StatusBadge } from '@/components/ui/status-badge'
import { ClipboardList } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Matrículas' }

const PAGE_SIZE = 20

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()

  const { data: enrollments, count } = await supabase
    .from('enrollments')
    .select('*, course:courses(title), student:profiles(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  return (
    <>
      <PageHeader
        olho="Administração"
        titulo="Matrículas"
        descricao={`${count ?? 0} ${count === 1 ? 'matrícula registrada' : 'matrículas registradas'}`}
      />

      <PageBody>
        {!enrollments || enrollments.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            titulo="Nenhuma matrícula ainda"
            descricao="Cada aluno que entra num curso — grátis ou pago — vira uma linha aqui."
          />
        ) : (
          <Panel>
            <ul className="divide-y divide-cobalto/10">
              {enrollments.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate text-sm font-medium text-tinta">
                      {(e.course as any)?.title ?? '—'}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-tinta-suave/70">
                      {(e.student as any)?.name ?? '—'} ·{' '}
                      {new Date(e.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-tinta">
                    {e.amount_paid === 0 ? 'Grátis' : formatCurrency(e.amount_paid ?? 0)}
                  </span>
                  {/* A matrícula reembolsada continua listada, com o estado à
                      mostra — some do faturamento, não do histórico. */}
                  {e.refund_status !== 'none' && (
                    <StatusBadge tipo="reembolso" status={e.refund_status} className="shrink-0" />
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Pagination page={page} totalPages={totalPages} buildHref={(p) => `/admin/matriculas?page=${p}`} />
      </PageBody>
    </>
  )
}
