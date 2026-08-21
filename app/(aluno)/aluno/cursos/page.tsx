import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, Search } from 'lucide-react'
import { getAuthedUser } from '@/lib/auth/session'
import { getStudentCourses, type StudentCourse } from '@/lib/data/student-courses'
import { StudentCourseCard } from '@/components/aluno/StudentCourseCard'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Meus cursos' }

const FILTROS = [
  { valor: undefined, label: 'Todos' },
  { valor: 'em_andamento', label: 'Em andamento' },
  { valor: 'nao_iniciado', label: 'Não iniciados' },
  { valor: 'concluido', label: 'Concluídos' },
] as const

type Filtro = StudentCourse['status']

/** Monta a querystring preservando o que já está filtrado. */
function href(params: { status?: string; q?: string }) {
  const sp = new URLSearchParams()
  if (params.status) sp.set('status', params.status)
  if (params.q) sp.set('q', params.q)
  const s = sp.toString()
  return s ? `/aluno/cursos?${s}` : '/aluno/cursos'
}

export default async function AlunoCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const { q, status } = await searchParams
  const user = await getAuthedUser()
  const courses = await getStudentCourses(user!.id)

  const statusAtivo = FILTROS.some((f) => f.valor === status) ? (status as Filtro) : undefined
  const busca = q?.trim().toLowerCase()

  // A lista é o conjunto de matrículas do próprio aluno — filtrar em memória
  // evita refazer o cruzamento com lesson_progress a cada clique de filtro.
  const visiveis = courses.filter((course) => {
    if (statusAtivo && course.status !== statusAtivo) return false
    if (busca && !course.title.toLowerCase().includes(busca)) return false
    return true
  })

  const contagens = {
    total: courses.length,
    em_andamento: courses.filter((c) => c.status === 'em_andamento').length,
    nao_iniciado: courses.filter((c) => c.status === 'nao_iniciado').length,
    concluido: courses.filter((c) => c.status === 'concluido').length,
  }

  return (
    <>
      <PageHeader
        olho="Sua biblioteca"
        titulo="Meus cursos"
        descricao={
          contagens.total === 0
            ? 'Tudo que você matricular aparece aqui.'
            : `${contagens.total} ${contagens.total === 1 ? 'curso' : 'cursos'} · ${contagens.concluido} concluído${contagens.concluido === 1 ? '' : 's'}`
        }
        acoes={
          <Link href="/cursos">
            <Button variant="outline">Explorar cursos</Button>
          </Link>
        }
      >
        {courses.length > 0 && (
          <>
            {/* GET nativo: busca sem client component nem JS */}
            <form action="/aluno/cursos" method="get" className="flex max-w-lg gap-2">
              {statusAtivo && <input type="hidden" name="status" value={statusAtivo} />}
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-tinta-suave"
                />
                <input
                  type="search"
                  name="q"
                  defaultValue={q ?? ''}
                  placeholder="Buscar nos seus cursos…"
                  aria-label="Buscar nos seus cursos por título"
                  className="h-11 w-full rounded-sm border-2 border-cobalto/20 bg-white pl-11 pr-3 text-sm text-tinta transition-colors placeholder:text-tinta-suave/90 hover:border-cobalto/40 focus:border-cobalto focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="h-11 shrink-0 rounded-sm bg-cobalto px-5 text-sm font-semibold text-cal transition-colors hover:bg-cobalto-claro"
              >
                Buscar
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {FILTROS.map((filtro) => {
                const ativo = statusAtivo === filtro.valor
                const contagem = filtro.valor ? contagens[filtro.valor] : contagens.total
                return (
                  <Link
                    key={filtro.label}
                    href={href({ status: filtro.valor, q })}
                    aria-current={ativo ? 'true' : undefined}
                    className={cn(
                      'rounded-sm px-3.5 py-1.5 text-sm font-semibold transition-colors',
                      ativo
                        ? 'bg-cobalto text-cal'
                        : 'bg-cobalto/8 text-tinta-suave hover:bg-cobalto/15 hover:text-tinta'
                    )}
                  >
                    {filtro.label}{' '}
                    <span className={cn('tabular-nums', ativo ? 'text-cal/60' : 'text-tinta-suave/60')}>
                      {contagem}
                    </span>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </PageHeader>

      <PageBody>
        {courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            titulo="Você ainda não tem cursos"
            descricao="Escolha um curso no catálogo e ele passa a viver aqui, com o progresso de cada aula."
            acao={
              <Link href="/cursos">
                <Button>Ver cursos disponíveis</Button>
              </Link>
            }
          />
        ) : visiveis.length === 0 ? (
          <EmptyState
            icon={Search}
            titulo="Nenhum curso com esses filtros"
            descricao="Tente outro termo ou volte pra lista inteira."
            acao={
              <Link href="/aluno/cursos">
                <Button variant="outline">Limpar filtros</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visiveis.map((course) => (
              <StudentCourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </PageBody>
    </>
  )
}
