import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { CourseReviewActions } from '@/components/admin/CourseReviewActions'
import { Pagination } from '@/components/ui/pagination'
import { BookOpen, ChefHat } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Cursos' }

const PAGE_SIZE = 20

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-cobalto/10 text-tinta-suave' },
  pending_review: { label: 'Em revisão', className: 'bg-amber-50 text-amber-800' },
  approved: { label: 'Aprovado', className: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Rejeitado', className: 'bg-red-50 text-red-700' },
}

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status, page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()

  let query = supabase
    .from('courses')
    .select('id, title, slug, status, price, category, created_at, teacher:profiles(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)

  const { data: courses, count } = await query

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  const tabs = [
    { label: 'Todos', value: '' },
    { label: 'Em revisão', value: 'pending_review' },
    { label: 'Aprovados', value: 'approved' },
    { label: 'Rejeitados', value: 'rejected' },
    { label: 'Rascunho', value: 'draft' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-tinta mb-2">Cursos</h1>
      <p className="text-tinta-suave mb-6">{count ?? 0} curso(s) encontrado(s)</p>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <a
            key={tab.value}
            href={tab.value ? `/admin/cursos?status=${tab.value}` : '/admin/cursos'}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              (status ?? '') === tab.value
                ? 'bg-brasa text-white'
                : 'bg-cobalto/10 text-tinta hover:bg-cobalto/15'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {!courses || courses.length === 0 ? (
        <div className="bg-white rounded-md border border-cobalto/15 p-16 text-center">
          <BookOpen className="h-10 w-10 text-cobalto/25 mx-auto mb-3" />
          <p className="text-tinta-suave/70 text-sm">Nenhum curso encontrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-md border border-cobalto/15 divide-y divide-cobalto/10">
          {courses.map((course) => {
            const s = STATUS_LABELS[course.status ?? 'draft'] ?? STATUS_LABELS.draft
            return (
              <div key={course.id} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-sm bg-brasa/10 flex items-center justify-center shrink-0">
                  <ChefHat className="h-5 w-5 text-brasa-clara" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-tinta truncate">{course.title}</p>
                  <p className="text-xs text-tinta-suave/70 mt-0.5">
                    por {(course.teacher as any)?.name ?? '—'}
                    {course.category && ` · ${course.category}`}
                    {' · '}{formatCurrency(course.price ?? 0)}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${s.className}`}>
                  {s.label}
                </span>
                <CourseReviewActions
                  courseId={course.id}
                  currentStatus={course.status ?? 'draft'}
                />
              </div>
            )
          })}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(p) => `/admin/cursos?${status ? `status=${status}&` : ''}page=${p}`}
      />
    </div>
  )
}
