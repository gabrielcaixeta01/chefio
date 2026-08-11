import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, Search, X } from 'lucide-react'
import { createPublicClient } from '@/lib/supabase/public'
import { COURSE_CATEGORIES } from '@/lib/utils'
import { CourseCard, type CourseCardData } from '@/components/curso/CourseCard'
import { ActionLink } from '@/components/ui/action-link'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { Pagination } from '@/components/ui/pagination'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Explorar cursos' }
export const revalidate = 300

const PAGE_SIZE = 12

const ERROS_CHECKOUT: Record<string, string> = {
  curso_invalido: 'Não foi possível identificar o curso selecionado. Tente de novo.',
  curso_indisponivel: 'Esse curso não está mais disponível.',
}

/** Monta a querystring preservando o que já está filtrado. */
function href(params: { category?: string; q?: string; page?: number }) {
  const sp = new URLSearchParams()
  if (params.category) sp.set('category', params.category)
  if (params.q) sp.set('q', params.q)
  if (params.page && params.page > 1) sp.set('page', String(params.page))
  const s = sp.toString()
  return s ? `/cursos?${s}` : '/cursos'
}

export default async function CourseCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; erro?: string; page?: string }>
}) {
  const { category, q, erro, page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let courses: CourseCardData[] = []
  let total = 0
  // Falha de verdade (RLS, rede, schema) tem que ser distinguível de
  // "ainda não há curso": em 10/08/2026 um `permission denied` deixou o
  // catálogo público fora do ar por horas mostrando "O catálogo está sendo
  // montado" — que parece estado normal de produto novo. supabase-js não
  // lança em erro HTTP, devolve `{ data: null, error }`, então o try/catk
  // sozinho nunca ia pegar isso.
  let falhou = false
  try {
    const supabase = createPublicClient()
    let query = supabase
      .from('courses')
      .select('id, title, slug, thumbnail_url, price, category, teacher:profiles(name)', { count: 'exact' })
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .range(from, to)
    if (category) query = query.eq('category', category)
    if (q) query = query.ilike('title', `%${q}%`)
    const { data, count, error } = await query
    if (error) throw error
    courses = (data as CourseCardData[] | null) ?? []
    total = count ?? 0
  } catch (err) {
    falhou = true
    console.error('[/cursos] falha ao carregar catálogo:', err)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const filtrando = Boolean(category || q)

  // Montado por partes para não sair "Nenhum curso encontrado. em Panificação"
  const contexto = [category && `em ${category}`, q && `para “${q}”`]
    .filter(Boolean)
    .join(' ')
  const contagem =
    total === 0
      ? 'Nenhum curso encontrado'
      : `${total} ${total === 1 ? 'curso' : 'cursos'}`
  const resumo = contexto ? `${contagem} ${contexto}` : contagem

  return (
    <>
      {/* ---------- Cabeçalho ---------- */}
      <section className="azulejo-escuro">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="olho text-brasa">Catálogo</p>
          <h1 className="mt-4 font-display text-[clamp(2.5rem,5vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-cal">
            Todos os cursos
          </h1>
          <p className="mt-4 text-cal/70">{resumo}</p>
        </div>
      </section>

      {/* ---------- Filtros ---------- */}
      <section className="border-b border-cobalto/15 bg-cal-fundo">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {erro && ERROS_CHECKOUT[erro] && (
            <Notice tipo="erro" role="alert" className="mb-6">
              {ERROS_CHECKOUT[erro]}
            </Notice>
          )}
          {/* GET nativo: busca sem client component nem JS */}
          <form action="/cursos" method="get" className="flex max-w-lg gap-2">
            {category && <input type="hidden" name="category" value={category} />}
            <div className="relative flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-tinta-suave"
              />
              <input
                type="search"
                name="q"
                defaultValue={q ?? ''}
                placeholder="Buscar por título…"
                aria-label="Buscar cursos por título"
                className="h-12 w-full rounded-sm border-2 border-cobalto/20 bg-white pl-11 pr-3 text-tinta transition-colors placeholder:text-tinta-suave/60 hover:border-cobalto/40 focus:border-cobalto focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="h-12 shrink-0 rounded-sm bg-cobalto px-5 text-sm font-semibold text-cal transition-colors hover:bg-cobalto-claro"
            >
              Buscar
            </button>
          </form>

          {/* Onze pílulas de contorno grosso viravam uma parede de seis linhas
              no celular e competiam com os cards. Mesma gramática leve da
              biblioteca do aluno: preenchimento fraco, contorno só no ativo. */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link
              href={href({ q })}
              aria-current={!category ? 'true' : undefined}
              className={cn(
                'rounded-sm px-3.5 py-1.5 text-sm font-semibold transition-colors',
                !category
                  ? 'bg-cobalto text-cal'
                  : 'bg-cobalto/8 text-tinta-suave hover:bg-cobalto/15 hover:text-tinta'
              )}
            >
              Todas
            </Link>
            {COURSE_CATEGORIES.map((cat) => {
              const ativa = category === cat
              return (
                <Link
                  key={cat}
                  href={href({ category: ativa ? undefined : cat, q })}
                  aria-current={ativa ? 'true' : undefined}
                  className={cn(
                    'rounded-sm px-3.5 py-1.5 text-sm font-semibold transition-colors',
                    ativa
                      ? 'bg-cobalto text-cal'
                      : 'bg-cobalto/8 text-tinta-suave hover:bg-cobalto/15 hover:text-tinta'
                  )}
                >
                  {cat}
                </Link>
              )
            })}
          </div>

          {filtrando && (
            <Link
              href="/cursos"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-cobalto underline-offset-4 hover:underline"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Limpar filtros
            </Link>
          )}
        </div>
      </section>

      {/* ---------- Resultados ---------- */}
      <section className="bg-cal">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          {total > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>

              <Pagination
                page={page}
                totalPages={totalPages}
                buildHref={(p) => href({ category, q, page: p })}
              />
            </>
          ) : falhou ? (
            /* Falha de carregamento — nunca se disfarça de catálogo vazio */
            <Notice
              tipo="erro"
              role="alert"
              titulo="Não foi possível carregar o catálogo."
              acao={
                <ActionLink href="/cursos" variant="cobalto">
                  Tentar de novo
                </ActionLink>
              }
            >
              O problema é do nosso lado, não da sua busca. Tente de novo em instantes.
            </Notice>
          ) : filtrando ? (
            /* Vazio por causa do filtro — o caminho de saída é limpar o filtro */
            <EmptyState
              icon={Search}
              titulo="Nada encontrado com esses filtros"
              descricao="Tente outra categoria ou busque por outro termo."
              acao={
                <ActionLink href="/cursos" variant="cobalto">
                  Ver todos os cursos
                </ActionLink>
              }
            />
          ) : (
            /* Vazio de verdade — nada a limpar, então o convite é publicar */
            <EmptyState
              icon={BookOpen}
              titulo="O catálogo está sendo montado"
              descricao="Os primeiros cursos entram em breve. Se você cozinha para viver, esse espaço pode ser seu."
              acao={
                <ActionLink href="/para-chefs" variant="cobalto">
                  Ensinar na Chefio
                </ActionLink>
              }
            />
          )}
        </div>
      </section>
    </>
  )
}
