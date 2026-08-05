import type { Metadata } from 'next'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { createPublicClient } from '@/lib/supabase/public'
import { COURSE_CATEGORIES } from '@/lib/utils'
import { CourseCard, type CourseCardData } from '@/components/curso/CourseCard'
import { ActionLink } from '@/components/ui/action-link'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Explorar cursos' }
export const revalidate = 300

/** Monta a querystring preservando o que já está filtrado. */
function href(params: { category?: string; q?: string }) {
  const sp = new URLSearchParams()
  if (params.category) sp.set('category', params.category)
  if (params.q) sp.set('q', params.q)
  const s = sp.toString()
  return s ? `/cursos?${s}` : '/cursos'
}

export default async function CourseCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>
}) {
  const { category, q } = await searchParams

  let courses: CourseCardData[] = []
  try {
    const supabase = createPublicClient()
    let query = supabase
      .from('courses')
      .select('id, title, slug, thumbnail_url, price, category, teacher:profiles(name)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    if (category) query = query.eq('category', category)
    if (q) query = query.ilike('title', `%${q}%`)
    const { data } = await query
    courses = (data as CourseCardData[] | null) ?? []
  } catch {
    // Supabase não configurado
  }

  const filtrando = Boolean(category || q)
  const total = courses.length

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

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link
              href={href({ q })}
              aria-current={!category ? 'true' : undefined}
              className={cn(
                'rounded-sm border-2 px-3.5 py-1.5 text-sm font-semibold transition-colors',
                !category
                  ? 'border-cobalto bg-cobalto text-cal'
                  : 'border-cobalto/20 text-tinta hover:border-cobalto/50'
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
                    'rounded-sm border-2 px-3.5 py-1.5 text-sm font-semibold transition-colors',
                    ativa
                      ? 'border-cobalto bg-cobalto text-cal'
                      : 'border-cobalto/20 text-tinta hover:border-cobalto/50'
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : filtrando ? (
            /* Vazio por causa do filtro — o caminho de saída é limpar o filtro */
            <div className="flex flex-col items-start gap-6 rounded-md border-2 border-dashed border-cobalto/30 p-10 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-2xl font-bold tracking-tight text-tinta">
                  Nada encontrado com esses filtros.
                </p>
                <p className="mt-2 text-tinta-suave">
                  Tente outra categoria ou busque por outro termo.
                </p>
              </div>
              <ActionLink href="/cursos" variant="cobalto">
                Ver todos os cursos
              </ActionLink>
            </div>
          ) : (
            /* Vazio de verdade — nada a limpar, então o convite é publicar */
            <div className="flex flex-col items-start gap-6 rounded-md border-2 border-dashed border-cobalto/30 p-10 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-2xl font-bold tracking-tight text-tinta">
                  O catálogo está sendo montado.
                </p>
                <p className="mt-2 max-w-md text-tinta-suave">
                  Os primeiros cursos entram em breve. Se você cozinha para
                  viver, esse espaço pode ser seu.
                </p>
              </div>
              <ActionLink href="/para-chefs" variant="cobalto">
                Ensinar na Chefio
              </ActionLink>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
