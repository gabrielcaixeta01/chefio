import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel } from '@/components/ui/panel'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { Plus, BookOpen } from 'lucide-react'

export const metadata: Metadata = { title: 'Meus Cursos' }

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
            <ul className="divide-y divide-cobalto/10">
              {courses.map((course) => (
                <li
                  key={course.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 transition-colors hover:bg-cal-fundo"
                >
                  <div className="h-14 w-24 shrink-0 overflow-hidden rounded-sm bg-cobalto/10">
                    {course.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- capa pode vir de host arbitrário
                      <img src={course.thumbnail_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <BookOpen className="h-6 w-6 text-cobalto/25" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate font-medium text-tinta">{course.title}</p>
                    <p className="mt-1 truncate text-xs text-tinta-suave/70">
                      {course.category && `${course.category} · `}
                      <span className="font-medium text-brasa-escura">
                        {course.price === 0 ? 'Grátis' : formatCurrency(course.price)}
                      </span>
                    </p>
                  </div>
                  <StatusBadge tipo="curso" status={course.status} className="shrink-0" />
                  <Link href={`/professor/cursos/${course.id}`} className="shrink-0">
                    <Button variant="outline" size="sm">Gerenciar</Button>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </PageBody>
    </>
  )
}
