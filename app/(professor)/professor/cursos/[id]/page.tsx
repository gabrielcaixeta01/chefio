import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PRAZO_REVISAO_DIAS_UTEIS, prazoDeRevisao } from '@/lib/utils'
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

        {/* Decisão 5.1: o motivo é escrito pelo admin e é isto aqui que o
            professor lê. Antes a tela mandava "corrija os problemas
            indicados" sem indicar problema nenhum. */}
        {course.status === 'rejected' && (
          <Notice tipo="erro" titulo="Curso rejeitado" className="mb-8">
            {course.rejection_reason ? (
              <>
                <span className="block whitespace-pre-line">{course.rejection_reason}</span>
                <span className="mt-2 block">
                  Corrija os pontos acima e envie de novo — a revisão recomeça do zero.
                </span>
              </>
            ) : (
              'Envie novamente para revisão depois de corrigir o curso.'
            )}
          </Notice>
        )}

        {/* Decisão 5.5: o prazo prometido, com data, no lugar onde ele
            importa — a tela que o professor abre pra saber "e aí?". */}
        {course.status === 'pending_review' && (
          <Notice tipo="info" titulo="Em revisão" className="mb-8">
            {course.submitted_at
              ? `Enviado em ${new Date(course.submitted_at).toLocaleDateString('pt-BR')}. A resposta sai até ${prazoDeRevisao(course.submitted_at).toLocaleDateString('pt-BR')} (${PRAZO_REVISAO_DIAS_UTEIS} dias úteis).`
              : `A resposta sai em até ${PRAZO_REVISAO_DIAS_UTEIS} dias úteis.`}{' '}
            Enquanto isso o curso continua editável.
          </Notice>
        )}

        {/* Decisão 6.4: o envio é o momento em que o professor afirma que o
            conteúdo segue a política — é ela que o motivo da rejeição cita. */}
        {canSubmit && (
          <p className="mb-8 text-xs text-tinta-suave/70">
            Ao enviar para revisão você declara que o curso segue a{' '}
            <Link
              href="/politica-de-conteudo"
              className="font-semibold text-cobalto underline-offset-4 hover:underline"
            >
              Política de conteúdo
            </Link>
            .
          </p>
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
