import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, Search } from 'lucide-react'
import { getAuthedUser } from '@/lib/auth/session'
import { getStudentCourses, type StudentCourse } from '@/lib/data/student-courses'
import { StudentCourseCard } from '@/components/aluno/StudentCourseCard'
import { Button } from '@/components/ui/button'
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
    <div>
      <div className="mb-8 flex items-center justify-between gap-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-tinta">Meus cursos</h1>
          <p className="mt-1 text-tinta-suave">
            {contagens.total === 0
              ? 'Nenhum curso ainda'
              : `${contagens.total} ${contagens.total === 1 ? 'curso' : 'cursos'} · ${contagens.concluido} concluído${contagens.concluido === 1 ? '' : 's'}`}
          </p>
        </div>
        <Link href="/cursos">
          <Button variant="outline">Explorar mais cursos</Button>
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-md border border-cobalto/15 bg-cal py-20 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-cobalto/25" />
          <h2 className="mb-2 font-display text-lg font-bold tracking-tight text-tinta">
            Você ainda não tem cursos
          </h2>
          <p className="mb-6 text-sm text-tinta-suave">
            Explore nossa biblioteca e comece sua jornada culinária!
          </p>
          <Link href="/cursos">
            <Button>Ver cursos disponíveis</Button>
          </Link>
        </div>
      ) : (
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
                className="h-11 w-full rounded-sm border-2 border-cobalto/20 bg-white pl-11 pr-3 text-sm text-tinta transition-colors placeholder:text-tinta-suave/60 hover:border-cobalto/40 focus:border-cobalto focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="h-11 shrink-0 rounded-sm bg-cobalto px-5 text-sm font-semibold text-cal transition-colors hover:bg-cobalto-claro"
            >
              Buscar
            </button>
          </form>

          <div className="mb-8 mt-4 flex flex-wrap items-center gap-2">
            {FILTROS.map((filtro) => {
              const ativo = statusAtivo === filtro.valor
              const contagem = filtro.valor ? contagens[filtro.valor] : contagens.total
              return (
                <Link
                  key={filtro.label}
                  href={href({ status: filtro.valor, q })}
                  aria-current={ativo ? 'true' : undefined}
                  className={cn(
                    'rounded-sm border-2 px-3.5 py-1.5 text-sm font-semibold transition-colors',
                    ativo
                      ? 'border-cobalto bg-cobalto text-cal'
                      : 'border-cobalto/20 text-tinta hover:border-cobalto/50'
                  )}
                >
                  {filtro.label} ({contagem})
                </Link>
              )
            })}
          </div>

          {visiveis.length === 0 ? (
            <div className="rounded-md border border-cobalto/15 bg-cal py-16 text-center">
              <p className="font-medium text-tinta-suave">Nenhum curso com esses filtros</p>
              <Link
                href="/aluno/cursos"
                className="mt-2 inline-block text-sm text-brasa-escura hover:underline"
              >
                Limpar filtros
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visiveis.map((course) => (
                <StudentCourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
