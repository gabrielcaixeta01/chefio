import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CourseForm } from '@/components/courses/CourseForm'
import { LessonList } from '@/components/courses/LessonList'
import { CourseSubmitButton } from '@/components/courses/CourseSubmitButton'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Gerenciar Curso' }

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .eq('teacher_id', user!.id)
    .single()

  if (!course) notFound()

  const { data: lessons } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', id)
    .order('order_index', { ascending: true })

  const canSubmit = course.status === 'draft' || course.status === 'rejected'
  const lessonCount = lessons?.length ?? 0

  return (
    <div className="max-w-3xl">
      <Link href="/professor/cursos" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Meus cursos
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          <span className={`inline-block mt-1 text-xs px-2.5 py-1 rounded-full font-medium ${
            course.status === 'approved' ? 'bg-green-100 text-green-700' :
            course.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
            course.status === 'rejected' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {course.status === 'approved' ? 'Publicado' :
             course.status === 'pending_review' ? 'Em revisão' :
             course.status === 'rejected' ? 'Rejeitado' : 'Rascunho'}
          </span>
        </div>
        {canSubmit && lessonCount > 0 && (
          <CourseSubmitButton courseId={course.id} />
        )}
      </div>

      {course.status === 'rejected' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
          <p className="text-red-800 text-sm font-medium">Curso rejeitado</p>
          <p className="text-red-700 text-xs mt-1">
            Corrija os problemas indicados pelo admin e envie novamente para revisão.
          </p>
        </div>
      )}

      {canSubmit && lessonCount === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
          <p className="text-amber-800 text-sm">
            Adicione pelo menos uma aula para poder enviar o curso para revisão.
          </p>
        </div>
      )}

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações do curso</h2>
        <CourseForm course={course} teacherId={user!.id} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Aulas</h2>
        <LessonList courseId={course.id} lessons={lessons ?? []} />
      </section>
    </div>
  )
}
