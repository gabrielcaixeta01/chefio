import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { ClipboardList } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Matrículas' }

export default async function AdminEnrollmentsPage() {
  const supabase = await createClient()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, course:courses(title), student:profiles(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Matrículas</h1>
      <p className="text-gray-500 mb-6">{enrollments?.length ?? 0} matrícula(s)</p>

      {!enrollments || enrollments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nenhuma matrícula ainda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {enrollments.map((e) => (
            <div key={e.id} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {(e.course as any)?.title ?? '—'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Aluno: {(e.student as any)?.name ?? '—'} ·{' '}
                  {new Date(e.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-900 shrink-0">
                {e.amount_paid === 0 ? 'Grátis' : formatCurrency(e.amount_paid ?? 0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
