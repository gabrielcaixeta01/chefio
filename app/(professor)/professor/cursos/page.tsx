import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel } from '@/components/ui/panel'
import { EmptyState } from '@/components/ui/empty-state'
import { Plus, BookOpen } from 'lucide-react'

export const metadata: Metadata = { title: 'Meus Cursos' }

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-cobalto/10 text-tinta-suave' },
  pending_review: { label: 'Em revisão', className: 'bg-amber-50 text-amber-800' },
  approved: { label: 'Publicado', className: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Rejeitado', className: 'bg-red-50 text-red-700' },
}

export default async function ProfessorCoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, slug, status, price, category, thumbnail_url, created_at')
    .eq('teacher_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <>
      <PageHeader
        olho="Biblioteca"
        titulo="Meus cursos"
        descricao={`${courses?.length ?? 0} ${courses?.length === 1 ? 'curso' : 'cursos'} criado${courses?.length === 1 ? '' : 's'}`}
        acoes={
          <Link href="/professor/cursos/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo curso
            </Button>
          </Link>
        }
      />

      <PageBody>
        {!courses || courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            titulo="Nenhum curso ainda"
            descricao="Crie seu primeiro curso e comece a ensinar na Chefio."
            acao={
              <Link href="/professor/cursos/novo">
                <Button>Criar primeiro curso</Button>
              </Link>
            }
          />
        ) : (
          <Panel className="overflow-hidden">
            <div className="divide-y divide-cobalto/10">
              {courses.map((course) => {
                const status = STATUS_LABELS[course.status ?? 'draft'] ?? STATUS_LABELS.draft
                return (
                  <div key={course.id} className="flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-cal-fundo">
                    <div className="h-14 w-24 shrink-0 overflow-hidden rounded-sm bg-cobalto/10">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <BookOpen className="h-6 w-6 text-cobalto/25" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-tinta">{course.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {course.category && <span className="text-xs text-tinta-suave/70">{course.category}</span>}
                        {course.category && <span className="text-cobalto/15">·</span>}
                        <span className="text-xs font-medium text-brasa-escura">
                          {course.price === 0 ? 'Grátis' : formatCurrency(course.price)}
                        </span>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-sm px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] ${status.className}`}>
                      {status.label}
                    </span>
                    <Link href={`/professor/cursos/${course.id}`}>
                      <Button variant="outline" size="sm">Gerenciar</Button>
                    </Link>
                  </div>
                )
              })}
            </div>
          </Panel>
        )}
      </PageBody>
    </>
  )
}
