import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { CourseReviewActions } from '@/components/admin/CourseReviewActions'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel } from '@/components/ui/panel'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { Ladrilho } from '@/components/ui/ladrilho'
import { Pagination } from '@/components/ui/pagination'
import { cn } from '@/lib/utils'
import { BookOpen, ChefHat } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Cursos' }

const PAGE_SIZE = 20

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

  const filtros = [
    { label: 'Todos', value: '' },
    { label: 'Em revisão', value: 'pending_review' },
    { label: 'Aprovados', value: 'approved' },
    { label: 'Rejeitados', value: 'rejected' },
    { label: 'Rascunho', value: 'draft' },
  ]

  return (
    <>
      <PageHeader
        olho="Administração"
        titulo="Cursos"
        descricao={`${count ?? 0} ${count === 1 ? 'curso' : 'cursos'} ${status ? 'neste filtro' : 'na plataforma'}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {filtros.map((filtro) => {
            const ativo = (status ?? '') === filtro.value
            return (
              <Link
                key={filtro.value}
                href={filtro.value ? `/admin/cursos?status=${filtro.value}` : '/admin/cursos'}
                aria-current={ativo ? 'true' : undefined}
                className={cn(
                  'rounded-sm px-3.5 py-1.5 text-sm font-semibold transition-colors',
                  ativo
                    ? 'bg-cobalto text-cal'
                    : 'bg-cobalto/8 text-tinta-suave hover:bg-cobalto/15 hover:text-tinta'
                )}
              >
                {filtro.label}
              </Link>
            )
          })}
        </div>
      </PageHeader>

      <PageBody>
        {!courses || courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            titulo="Nenhum curso neste filtro"
            descricao="Troque o filtro acima ou espere um professor enviar o primeiro curso pra revisão."
          />
        ) : (
          <Panel>
            <ul className="divide-y divide-cobalto/10">
              {courses.map((course) => (
                // gap-y junto com flex-wrap: no celular o badge e os botões de
                // revisão descem pra segunda linha em vez de espremer o título
                // até ele sumir.
                <li key={course.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                  <Ladrilho tom="cobalto" tamanho="md">
                    <ChefHat className="h-4 w-4" aria-hidden="true" />
                  </Ladrilho>
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate font-medium text-tinta">{course.title}</p>
                    <p className="mt-0.5 truncate text-xs text-tinta-suave/70">
                      por {(course.teacher as any)?.name ?? '—'}
                      {course.category && ` · ${course.category}`}
                      {' · '}
                      {course.price === 0 ? 'Grátis' : formatCurrency(course.price ?? 0)}
                    </p>
                  </div>
                  <StatusBadge
                    tipo="curso"
                    status={course.status}
                    label={course.status === 'approved' ? 'Aprovado' : undefined}
                    className="shrink-0"
                  />
                  <CourseReviewActions courseId={course.id} currentStatus={course.status ?? 'draft'} />
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          buildHref={(p) => `/admin/cursos?${status ? `status=${status}&` : ''}page=${p}`}
        />
      </PageBody>
    </>
  )
}
