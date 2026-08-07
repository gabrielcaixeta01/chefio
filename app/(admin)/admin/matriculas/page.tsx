import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { Pagination } from '@/components/ui/pagination'
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
    <div>
      <h1 className="font-display text-3xl font-extrabold text-tinta mb-2 tracking-tight">Matrículas</h1>
      <p className="text-tinta-suave mb-6">{count ?? 0} matrícula(s)</p>

      {!enrollments || enrollments.length === 0 ? (
        <div className="bg-cal rounded-md border border-cobalto/15 p-16 text-center">
          <ClipboardList className="h-10 w-10 text-cobalto/25 mx-auto mb-3" />
          <p className="text-tinta-suave/70 text-sm">Nenhuma matrícula ainda.</p>
        </div>
      ) : (
        <div className="bg-cal rounded-md border border-cobalto/15 divide-y divide-cobalto/10">
          {enrollments.map((e) => (
            <div key={e.id} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-tinta text-sm truncate">
                  {(e.course as any)?.title ?? '—'}
                </p>
                <p className="text-xs text-tinta-suave/70 mt-0.5">
                  Aluno: {(e.student as any)?.name ?? '—'} ·{' '}
                  {new Date(e.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <span className="text-sm font-semibold text-tinta shrink-0">
                {e.amount_paid === 0 ? 'Grátis' : formatCurrency(e.amount_paid ?? 0)}
              </span>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} buildHref={(p) => `/admin/matriculas?page=${p}`} />
    </div>
  )
}
