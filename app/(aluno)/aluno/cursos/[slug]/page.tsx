import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { formatDuration } from '@/lib/utils'
import { Notebook } from '@/components/player/Notebook'
import { CheckCircle, Circle, Play, Lock, Clock, ChefHat } from 'lucide-react'

export const metadata: Metadata = { title: 'Assistir curso' }

export default async function AlunoCourseOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ success?: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: course } = await supabase
    .from('courses')
    .select('id, title, slug, thumbnail_url, teacher:profiles(name)')
    .eq('slug', slug)
    .single()

  if (!course) notFound()

  // Verify enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', user!.id)
    .eq('course_id', course.id)
    .single()

  if (!enrollment) redirect(`/curso/${slug}`)

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, duration_seconds, order_index, is_free_preview, bunny_video_id')
    .eq('course_id', course.id)
    .order('order_index', { ascending: true })

  const { data: progressRows } = await supabase
    .from('lesson_progress')
    .select('lesson_id, completed_at')
    .eq('student_id', user!.id)
    .in('lesson_id', (lessons ?? []).map((l) => l.id))

  const completedIds = new Set((progressRows ?? []).filter((p) => p.completed_at).map((p) => p.lesson_id))

  const { data: notebook } = await supabase
    .from('notebooks')
    .select('content')
    .eq('student_id', user!.id)
    .eq('course_id', course.id)
    .single()

  const totalLessons = lessons?.length ?? 0
  const completedCount = completedIds.size
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0
  const firstLesson = lessons?.[0]

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        {(course.thumbnail_url) && (
          <div className="relative w-16 h-10 rounded overflow-hidden shrink-0">
            <Image src={course.thumbnail_url} alt={course.title} fill className="object-cover" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{course.title}</h1>
          <p className="text-sm text-gray-500">por {(course.teacher as any)?.name}</p>
        </div>
      </div>

      {/* Progresso */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Seu progresso</span>
          <span className="text-sm font-bold text-orange-600">{progressPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-orange-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{completedCount} de {totalLessons} aulas concluídas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de aulas */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            <div className="px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">Aulas do curso</h2>
              {firstLesson && (
                <Link
                  href={`/aluno/cursos/${slug}/aulas/${firstLesson.id}`}
                  className="text-xs text-orange-600 hover:underline font-medium"
                >
                  {completedCount === 0 ? 'Começar →' : 'Continuar →'}
                </Link>
              )}
            </div>
            {(lessons ?? []).map((lesson, index) => {
              const isCompleted = completedIds.has(lesson.id)
              const hasVideo = !!lesson.bunny_video_id
              return (
                <Link
                  key={lesson.id}
                  href={`/aluno/cursos/${slug}/aulas/${lesson.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                >
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-300 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isCompleted ? 'text-gray-400' : 'text-gray-700 group-hover:text-orange-600'}`}>
                      {index + 1}. {lesson.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lesson.duration_seconds && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(lesson.duration_seconds)}
                      </span>
                    )}
                    {hasVideo ? (
                      <Play className="h-3.5 w-3.5 text-gray-400" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-gray-300" />
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Caderno */}
        <div className="lg:col-span-1">
          <Notebook
            courseId={course.id}
            studentId={user!.id}
            initialContent={notebook?.content}
          />
        </div>
      </div>
    </div>
  )
}
