import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CourseForm } from '@/components/courses/CourseForm'
import { LessonList } from '@/components/courses/LessonList'
import { CourseSubmitButton } from '@/components/courses/CourseSubmitButton'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel, SectionHeading } from '@/components/ui/panel'
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
    <>
      <PageHeader
        olho="Edição"
        titulo={course.title}
        descricao="Gerencie informações, aulas e publicação do curso"
        acoes={
          canSubmit && lessonCount > 0 ? (
            <CourseSubmitButton courseId={course.id} />
          ) : undefined
        }
      />

      <PageBody className="max-w-3xl">
        <div className="mb-4 flex items-center gap-2 text-sm text-tinta-suave">
          <Link href="/professor/cursos" className="inline-flex items-center hover:text-tinta">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Meus cursos
          </Link>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <span className={`rounded-sm px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] ${
            course.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
            course.status === 'pending_review' ? 'bg-amber-50 text-amber-800' :
            course.status === 'rejected' ? 'bg-red-50 text-red-700' :
            'bg-cobalto/10 text-tinta-suave'
          }`}>
            {course.status === 'approved' ? 'Publicado' :
             course.status === 'pending_review' ? 'Em revisão' :
             course.status === 'rejected' ? 'Rejeitado' : 'Rascunho'}
          </span>
        </div>

        {course.status === 'rejected' && (
          <Panel className="mb-8 border-red-200 bg-red-50/80 p-4">
            <p className="text-sm font-medium text-red-800">Curso rejeitado</p>
            <p className="mt-1 text-xs text-red-700">Corrija os problemas indicados pelo admin e envie novamente para revisão.</p>
          </Panel>
        )}

        {canSubmit && lessonCount === 0 && (
          <Panel className="mb-8 border-amber-200 bg-amber-50/80 p-4">
            <p className="text-sm text-amber-800">Adicione pelo menos uma aula para poder enviar o curso para revisão.</p>
          </Panel>
        )}

        <section className="mb-10">
          <SectionHeading titulo="Informações do curso" className="mb-4" />
          <CourseForm course={course} teacherId={user!.id} />
        </section>

        <section>
          <SectionHeading titulo="Aulas" className="mb-4" />
          <LessonList courseId={course.id} lessons={lessons ?? []} />
        </section>
      </PageBody>
    </>
  )
}
