import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createPublicClient } from '@/lib/supabase/public'
import { Badge } from '@/components/ui/badge'
import { Ladrilho } from '@/components/ui/ladrilho'
import { Skeleton } from '@/components/ui/skeleton'
import { PurchaseBox } from '@/components/curso/PurchaseBox'
import { formatCurrency, formatDuration, formatCourseDuration } from '@/lib/utils'
import { Lock, Play, Clock, ChefHat, BookOpen } from 'lucide-react'

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = createPublicClient()
  const { data: course } = await supabase
    .from('courses')
    .select('title, description')
    .eq('slug', slug)
    .single()
  return { title: course?.title ?? 'Curso', description: course?.description ?? '' }
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createPublicClient()

  const { data: course, error } = await supabase
    .from('courses')
    .select(`
      *,
      teacher:profiles(id, name, avatar_url)
    `)
    .eq('slug', slug)
    .eq('status', 'approved')
    // Fora do catálogo = fora da página de venda. Quem comprou continua
    // assistindo por /aluno/cursos/[slug] (decisão 3.3).
    .is('archived_at', null)
    .maybeSingle()

  // `maybeSingle` devolve `data: null` sem erro quando o curso não existe, o
  // que deixa `error` significando só uma coisa: falhou de verdade (RLS,
  // rede, schema). Com `.single()` os dois casos vinham como erro e o
  // `if (!course) notFound()` respondia 404 para ambos — foi assim que a
  // recursão de policy corrigida na 00024 deixou TODAS as páginas de curso
  // dizendo "não encontrado", que parece catálogo despublicado e não incidente.
  if (error) throw error
  if (!course) notFound()

  // View pública (só user_id + bio) — o resto de teacher_profiles, como
  // stripe_account_id, não deve vazar pro catálogo (00003_security_fixes.sql).
  const { data: teacherPublic } = await supabase
    .from('teacher_profiles_public')
    .select('bio')
    .eq('user_id', course.teacher_id)
    .maybeSingle()

  // Currículo pela view pública (00025) e não pelo embed de `lessons`: sob RLS
  // o anônimo só enxerga as aulas de prévia, então esta página anunciava
  // "1 aula" e listava um item em cursos de cinco. A view mostra o curso
  // inteiro sem entregar `bunny_video_id`.
  const { data: lessonsData, error: erroAulas } = await supabase
    .from('lessons_publicas')
    .select('id, title, duration_seconds, is_free_preview, order_index')
    .eq('course_id', course.id)
    .order('order_index', { ascending: true })

  if (erroAulas) throw erroAulas

  const lessons = lessonsData ?? []
  const totalDuration = lessons.reduce((sum, l) => sum + (l.duration_seconds ?? 0), 0)
  const previas = lessons.filter((l) => l.is_free_preview).length

  return (
    <>
      {/* ---------- Cabeçalho ----------
          Faixa de azulejo como no catálogo e na home. Antes a página abria
          direto na miniatura: era a única tela pública que começava sem a
          marca, e parecia ter caído de outro site. */}
      <section className="azulejo-escuro">
        <div className="relative mx-auto max-w-6xl px-4 py-cabecalho sm:px-6 lg:px-8">
          {course.category && <p className="olho text-brasa-clara">{course.category}</p>}
          <h1 className="mt-4 max-w-3xl font-display text-secao font-extrabold text-cal">
            {course.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-cal/70">
            <span>por {(course.teacher as any)?.name ?? 'Chefio'}</span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              {lessons.length} {lessons.length === 1 ? 'aula' : 'aulas'}
            </span>
            {totalDuration > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {formatCourseDuration(totalDuration)}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-corpo sm:px-6 lg:px-8">
        {/* A caixa de compra vem antes no DOM e volta pra direita a partir de
            lg. No mobile ela ficava depois da lista inteira de aulas: o preço
            e o botão só apareciam depois de uns três scrolls. */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <aside className="lg:order-2 lg:col-span-1">
            <div className="sticky top-24 rounded-md border border-cobalto/15 bg-cal p-6">
              <p className="font-display text-3xl font-extrabold tabular-nums tracking-tight text-tinta">
                {course.price === 0 ? 'Grátis' : formatCurrency(course.price)}
              </p>

              <Suspense fallback={<Skeleton className="mt-4 h-12 w-full" />}>
                <PurchaseBox courseId={course.id} courseSlug={course.slug} price={course.price} />
              </Suspense>

              <ul className="mt-6 flex flex-col gap-2.5 text-sm text-tinta-suave">
                <li className="flex items-center gap-2.5">
                  <BookOpen className="h-4 w-4 shrink-0 text-cobalto" aria-hidden="true" />
                  {lessons.length} {lessons.length === 1 ? 'aula em vídeo' : 'aulas em vídeo'}
                </li>
                <li className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 shrink-0 text-cobalto" aria-hidden="true" />
                  Acesso vitalício
                </li>
                <li className="flex items-center gap-2.5">
                  <ChefHat className="h-4 w-4 shrink-0 text-cobalto" aria-hidden="true" />
                  Produtos recomendados por aula
                </li>
              </ul>
            </div>
          </aside>

          <div className="lg:order-1 lg:col-span-2">
            <div className="relative mb-8 aspect-video overflow-hidden rounded-md bg-cobalto/10">
              {course.thumbnail_url ? (
                <Image
                  src={course.thumbnail_url}
                  alt={course.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  priority
                  className="object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="azulejo-escuro h-full w-full [--azulejo-tamanho:56px]"
                />
              )}
            </div>

            {course.description && (
              <section className="mb-10">
                <h2 className="mb-3 font-display text-xl font-bold tracking-tight text-tinta">
                  Sobre o curso
                </h2>
                <p className="max-w-2xl leading-relaxed text-tinta-suave">{course.description}</p>
              </section>
            )}

            <section className="mb-10 flex items-start gap-4 rounded-md border border-cobalto/15 bg-cal-fundo p-5">
              <Ladrilho tom="cobalto" tamanho="lg">
                <ChefHat className="h-5 w-5" aria-hidden="true" />
              </Ladrilho>
              <div className="min-w-0">
                <p className="olho text-brasa-escura">Quem ensina</p>
                <p className="mt-1.5 font-display text-lg font-bold tracking-tight text-tinta">
                  {(course.teacher as any)?.name ?? 'Chefio'}
                </p>
                {teacherPublic?.bio && (
                  <p className="mt-1.5 leading-relaxed text-sm text-tinta-suave">{teacherPublic.bio}</p>
                )}
              </div>
            </section>

            <section>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-display text-xl font-bold tracking-tight text-tinta">
                  Conteúdo do curso
                </h2>
                {previas > 0 && (
                  <p className="text-sm text-tinta-suave">
                    {previas} {previas === 1 ? 'aula liberada' : 'aulas liberadas'} como prévia
                  </p>
                )}
              </div>

              <ul className="overflow-hidden rounded-md border border-cobalto/15 bg-cal">
                {lessons.map((lesson: any, index: number) => (
                  <li
                    key={lesson.id}
                    className="flex items-center gap-3 border-b border-cobalto/10 px-4 py-3 last:border-b-0"
                  >
                    {lesson.is_free_preview ? (
                      <Play className="h-4 w-4 shrink-0 text-brasa-escura" aria-hidden="true" />
                    ) : (
                      <Lock className="h-4 w-4 shrink-0 text-cobalto/30" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1 text-sm text-tinta">
                      <span className="tabular-nums text-tinta-suave/70">{index + 1}.</span>{' '}
                      {lesson.title}
                    </span>
                    {lesson.is_free_preview && <Badge variant="default">Prévia grátis</Badge>}
                    {lesson.duration_seconds && (
                      <span className="shrink-0 text-xs tabular-nums text-tinta-suave/70">
                        {formatDuration(lesson.duration_seconds)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
