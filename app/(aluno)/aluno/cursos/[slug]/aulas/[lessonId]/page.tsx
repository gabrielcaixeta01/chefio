import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { VideoPlayer } from '@/components/player/VideoPlayer'
import { LessonProgressButton } from '@/components/player/LessonProgressButton'
import { Notebook } from '@/components/player/Notebook'
import { LessonProducts } from '@/components/player/LessonProducts'
import { ExportNotebook } from '@/components/player/ExportNotebook'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'

export const metadata: Metadata = { title: 'Aula' }

export default async function LessonPlayerPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>
}) {
  const { slug, lessonId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: course } = await supabase
    .from('courses')
    .select('id, title, slug')
    .eq('slug', slug)
    .single()

  if (!course) notFound()

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', user!.id)
    .eq('course_id', course.id)
    .single()

  if (!enrollment) redirect(`/curso/${slug}`)

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, description, order_index, bunny_video_id, is_free_preview')
    .eq('id', lessonId)
    .eq('course_id', course.id)
    .single()

  if (!lesson) notFound()

  const { data: allLessons } = await supabase
    .from('lessons')
    .select('id, title, order_index')
    .eq('course_id', course.id)
    .order('order_index', { ascending: true })

  const lessonIndex = (allLessons ?? []).findIndex((l) => l.id === lessonId)
  const prevLesson = lessonIndex > 0 ? allLessons![lessonIndex - 1] : null
  const nextLesson = lessonIndex < (allLessons?.length ?? 0) - 1 ? allLessons![lessonIndex + 1] : null

  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('completed_at')
    .eq('student_id', user!.id)
    .eq('lesson_id', lessonId)
    .single()

  const isCompleted = !!progress?.completed_at

  const { data: notebook } = await supabase
    .from('notebooks')
    .select('content')
    .eq('student_id', user!.id)
    .eq('course_id', course.id)
    .single()

  // Fetch products recommended for this lesson
  const { data: lessonProductRows } = await supabase
    .from('lesson_products')
    .select('product:products(id, name, price, image_url, description)')
    .eq('lesson_id', lessonId)

  const lessonProducts = (lessonProductRows ?? [])
    .map((r) => r.product as any)
    .filter(Boolean)

  const notebookDomId = `notebook-${course.id}`

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href={`/aluno/cursos/${slug}`} className="hover:text-orange-600 transition-colors">
          {course.title}
        </Link>
        <span>/</span>
        <span className="text-gray-700 truncate">{lesson.title}</span>
      </div>

      <div className="mb-4">
        {lesson.bunny_video_id ? (
          <VideoPlayer lessonId={lessonId} />
        ) : (
          <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Lock className="h-10 w-10 mx-auto mb-2" />
              <p className="text-sm">Vídeo ainda não disponível</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{lesson.title}</h1>
          {lesson.description && (
            <p className="text-sm text-gray-500 mt-1">{lesson.description}</p>
          )}
        </div>
        <LessonProgressButton
          lessonId={lessonId}
          studentId={user!.id}
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
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-orange-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="truncate max-w-[200px]">{prevLesson.title}</span>
          </Link>
        ) : <div />}
        {nextLesson ? (
          <Link
            href={`/aluno/cursos/${slug}/aulas/${nextLesson.id}`}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-orange-600 transition-colors"
          >
            <span className="truncate max-w-[200px]">{nextLesson.title}</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : <div />}
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">Caderno</span>
        <ExportNotebook courseTitle={course.title} notebookId={notebookDomId} />
      </div>
      <div id={notebookDomId}>
        <Notebook
          courseId={course.id}
          studentId={user!.id}
          initialContent={notebook?.content}
        />
      </div>
    </div>
  )
}
