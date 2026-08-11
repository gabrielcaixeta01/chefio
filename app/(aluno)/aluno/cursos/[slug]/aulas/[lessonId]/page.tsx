import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser } from '@/lib/auth/session'
import { VideoPlayer } from '@/components/player/VideoPlayer'
import { LessonProgressButton } from '@/components/player/LessonProgressButton'
import { Notebook } from '@/components/player/Notebook'
import { LessonProducts } from '@/components/player/LessonProducts'
import { ExportNotebook } from '@/components/player/ExportNotebook'
import { PageBody } from '@/components/layout/PageShell'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'

export const metadata: Metadata = { title: 'Aula' }

export default async function LessonPlayerPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>
}) {
  const { slug, lessonId } = await params
  const supabase = await createClient()
  const user = await getAuthedUser()

  const { data: course } = await supabase
    .from('courses')
    .select('id, title, slug')
    .eq('slug', slug)
    .single()

  if (!course) notFound()

  const [
    { data: enrollment },
    { data: lesson },
    { data: allLessons },
    { data: progress },
    { data: notebook },
    { data: lessonProductRows },
  ] = await Promise.all([
    supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', user!.id)
      .eq('course_id', course.id)
      .maybeSingle(),
    supabase
      .from('lessons')
      .select('id, title, description, order_index, bunny_video_id, is_free_preview')
      .eq('id', lessonId)
      .eq('course_id', course.id)
      .maybeSingle(),
    supabase
      .from('lessons')
      .select('id, title, order_index')
      .eq('course_id', course.id)
      .order('order_index', { ascending: true }),
    supabase
      .from('lesson_progress')
      .select('completed_at')
      .eq('student_id', user!.id)
      .eq('lesson_id', lessonId)
      .maybeSingle(),
    supabase
      .from('notebooks')
      .select('content')
      .eq('student_id', user!.id)
      .eq('course_id', course.id)
      .maybeSingle(),
    supabase
      .from('lesson_products')
      .select('product:products(id, name, price, image_url, description)')
      .eq('lesson_id', lessonId),
  ])

  if (!enrollment) redirect(`/curso/${slug}`)
  if (!lesson) notFound()

  const lessonIndex = (allLessons ?? []).findIndex((l) => l.id === lessonId)
  const prevLesson = lessonIndex > 0 ? allLessons![lessonIndex - 1] : null
  const nextLesson = lessonIndex < (allLessons?.length ?? 0) - 1 ? allLessons![lessonIndex + 1] : null

  const isCompleted = !!progress?.completed_at

  const lessonProducts = (lessonProductRows ?? [])
    .map((r) => r.product as any)
    .filter(Boolean)

  const notebookDomId = `notebook-${course.id}`

  return (
    // PageBody, e não um div solto: sem ele a aula era a única página logada
    // sem margem nenhuma — o player e o texto encostavam na borda da tela.
    // Sem PageHeader aqui de propósito: o vídeo é o assunto, e uma faixa de
    // título antes dele empurraria o player pra baixo da dobra no celular.
    <PageBody className="max-w-5xl">
      <div className="mb-4 flex items-center gap-2 text-sm text-tinta-suave">
        <Link href={`/aluno/cursos/${slug}`} className="truncate transition-colors hover:text-brasa-escura">
          {course.title}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate text-tinta">{lesson.title}</span>
      </div>

      <div className="mb-4">
        {lesson.bunny_video_id ? (
          <VideoPlayer lessonId={lessonId} />
        ) : (
          <div className="aspect-video bg-cobalto/10 rounded-md flex items-center justify-center">
            <div className="text-center text-tinta-suave/70">
              <Lock className="h-10 w-10 mx-auto mb-2" />
              <p className="text-sm">Vídeo ainda não disponível</p>
            </div>
          </div>
        )}
      </div>

      {/* flex-wrap: num celular o botão de concluir descia por cima do título */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-64">
          <h1 className="font-display text-2xl font-bold tracking-tight text-tinta">{lesson.title}</h1>
          {lesson.description && (
            <p className="mt-1 text-sm text-tinta-suave">{lesson.description}</p>
          )}
        </div>
        <LessonProgressButton
          lessonId={lessonId}
          isCompleted={isCompleted}
          nextLessonId={nextLesson?.id}
          courseSlug={slug}
        />
      </div>

      {/* Produtos recomendados da aula */}
      <LessonProducts products={lessonProducts} />

      <div className="flex items-center justify-between my-8">
        {prevLesson ? (
          <Link
            href={`/aluno/cursos/${slug}/aulas/${prevLesson.id}`}
            className="flex items-center gap-1 text-sm text-tinta-suave hover:text-brasa-escura transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="truncate max-w-50">{prevLesson.title}</span>
          </Link>
        ) : <div />}
        {nextLesson ? (
          <Link
            href={`/aluno/cursos/${slug}/aulas/${nextLesson.id}`}
            className="flex items-center gap-1 text-sm text-tinta-suave hover:text-brasa-escura transition-colors"
          >
            <span className="truncate max-w-50">{nextLesson.title}</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : <div />}
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-tinta">Caderno</span>
        <ExportNotebook courseTitle={course.title} notebookId={notebookDomId} />
      </div>
      <div id={notebookDomId}>
        <Notebook
          courseId={course.id}
          studentId={user!.id}
          initialContent={notebook?.content}
        />
      </div>
    </PageBody>
  )
}
