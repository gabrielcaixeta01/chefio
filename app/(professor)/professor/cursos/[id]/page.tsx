import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CourseForm } from '@/components/courses/CourseForm'
import { LessonList } from '@/components/courses/LessonList'
import { CourseSubmitButton } from '@/components/courses/CourseSubmitButton'
import { CourseArchiveToggle } from '@/components/courses/CourseArchiveToggle'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { SectionHeading } from '@/components/ui/panel'
import { Notice } from '@/components/ui/notice'
import { StatusBadge } from '@/components/ui/status-badge'
import { Badge } from '@/components/ui/badge'
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

  const [{ data: lessons }, { count: alunos }, { data: pedidos }] = await Promise.all([
    supabase
      .from('lessons')
      .select('*')
      .eq('course_id', id)
      .order('order_index', { ascending: true }),
    // Matrícula reembolsada não conta como aluno com acesso (decisão 2.3), então
    // também não trava a edição do curso.
    supabase
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', id)
      .is('refunded_at', null),
    supabase
      .from('lesson_change_requests')
      .select('id, lesson_id, type')
      .eq('course_id', id)
      .eq('status', 'pending'),
  ])

  const canSubmit = course.status === 'draft' || course.status === 'rejected'
  const lessonCount = lessons?.length ?? 0
  const temAlunos = (alunos ?? 0) > 0

  return (
    <>
      <PageHeader
        olho="Edição"
        titulo={course.title}
        descricao="Gerencie informações, aulas e publicação do curso"
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            {canSubmit && lessonCount > 0 && <CourseSubmitButton courseId={course.id} />}
            {course.status === 'approved' && (
              <CourseArchiveToggle
                courseId={course.id}
                arquivado={!!course.archived_at}
                temAlunos={temAlunos}
              />
            )}
          </div>
        }
      />

      <PageBody className="max-w-3xl">
        <div className="mb-4 flex items-center gap-2 text-sm text-tinta-suave">
          <Link href="/professor/cursos" className="inline-flex items-center hover:text-tinta">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Meus cursos
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <StatusBadge tipo="curso" status={course.status} />
          {course.archived_at && <Badge variant="neutral">Fora do catálogo</Badge>}
          {temAlunos && (
            <span className="text-xs text-tinta-suave/70">
              {alunos} {alunos === 1 ? 'aluno matriculado' : 'alunos matriculados'}
            </span>
          )}
        </div>

        {course.archived_at && (
          <Notice tipo="info" titulo="Fora do catálogo" className="mb-8">
            O curso não aparece na vitrine e não pode ser comprado. Quem já comprou continua
            com acesso normal.
          </Notice>
        )}

        {course.status === 'rejected' && (
          <Notice tipo="erro" titulo="Curso rejeitado" className="mb-8">
            Corrija os problemas indicados pelo admin e envie novamente para revisão.
          </Notice>
        )}

        {canSubmit && lessonCount === 0 && (
          <Notice tipo="atencao" className="mb-8">
            Adicione pelo menos uma aula para poder enviar o curso para revisão.
          </Notice>
        )}

        <section className="mb-10">
          <SectionHeading titulo="Informações do curso" className="mb-4" />
          <CourseForm course={course} teacherId={user!.id} />
        </section>

        <section>
          <SectionHeading titulo="Aulas" className="mb-4" />
          <LessonList
            courseId={course.id}
            lessons={lessons ?? []}
            temAlunos={temAlunos}
            pedidosPendentes={pedidos ?? []}
          />
        </section>
      </PageBody>
    </>
  )
}
