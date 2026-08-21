import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser } from '@/lib/auth/session'
import { formatDuration, diasRestantesReembolso } from '@/lib/utils'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel, SectionHeading } from '@/components/ui/panel'
import { Notice } from '@/components/ui/notice'
import { Notebook } from '@/components/player/Notebook'
import { RefundButton } from '@/components/aluno/RefundButton'
import { CheckCircle, Circle, Play, Lock, Clock, ArrowRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Assistir curso' }

export default async function AlunoCourseOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const user = await getAuthedUser()

  const { data: course, error } = await supabase
    .from('courses')
    .select('id, title, slug, thumbnail_url, teacher:profiles(name)')
    .eq('slug', slug)
    .maybeSingle()

  // Esta é a página do acesso vitalício (3.1). Responder 404 numa falha de
  // leitura diz ao aluno que o curso que ele comprou não existe mais — o
  // oposto exato da promessa. Erro de verdade tem que aparecer como erro.
  if (error) throw error
  if (!course) notFound()

  const [{ data: enrollment }, { data: lessons }, { data: notebook }] = await Promise.all([
    supabase
      .from('enrollments')
      .select('id, created_at, refund_status, refunded_at')
      .eq('student_id', user!.id)
      .eq('course_id', course.id)
      .maybeSingle(),
    supabase
      .from('lessons')
      .select('id, title, duration_seconds, order_index, is_free_preview, bunny_video_id')
      .eq('course_id', course.id)
      .order('order_index', { ascending: true }),
    supabase
      .from('notebooks')
      .select('content')
      .eq('student_id', user!.id)
      .eq('course_id', course.id)
      .maybeSingle(),
  ])

  // Reembolsada = acesso encerrado na hora (decisão 2.3). As policies de
  // lessons/lesson_attachments já barram o conteúdo; aqui é só não deixar a
  // pessoa numa página vazia sem explicação.
  if (!enrollment || enrollment.refunded_at) redirect(`/curso/${slug}`)

  const diasParaReembolso = diasRestantesReembolso(enrollment.created_at)

  const { data: progressRows } = await supabase
    .from('lesson_progress')
    .select('lesson_id, completed_at')
    .eq('student_id', user!.id)
    .in('lesson_id', (lessons ?? []).map((l) => l.id))

  const completedIds = new Set((progressRows ?? []).filter((p) => p.completed_at).map((p) => p.lesson_id))

  const totalLessons = lessons?.length ?? 0
  const completedCount = completedIds.size
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0
  const firstLesson = lessons?.[0]

  return (
    <>
      <PageHeader
        olho="Curso"
        titulo={course.title}
        descricao={`por ${(course.teacher as any)?.name ?? 'Chefio'}`}
        acoes={
          firstLesson ? (
            <Link href={`/aluno/cursos/${slug}/aulas/${firstLesson.id}`} className="inline-flex items-center gap-2 rounded-sm bg-cobalto px-4 py-2.5 text-sm font-semibold text-cal transition-colors hover:bg-cobalto-claro">
              {completedCount === 0 ? 'Começar agora' : 'Continuar'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : undefined
        }
      />

      <PageBody>
        <Panel className="mb-6 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-tinta">Seu progresso</p>
              <p className="mt-1 text-sm text-tinta-suave">{completedCount} de {totalLessons} aulas concluídas</p>
            </div>
            <span className="text-lg font-extrabold text-brasa-escura">{progressPct}%</span>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-cobalto/10">
            <div className="h-2 rounded-full bg-brasa transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.65fr_0.95fr]">
          <Panel className="overflow-hidden">
            <SectionHeading
              titulo="Aulas do curso"
              acao={
                firstLesson ? (
                  <Link href={`/aluno/cursos/${slug}/aulas/${firstLesson.id}`} className="text-sm font-semibold text-brasa-escura hover:underline">
                    {completedCount === 0 ? 'Começar →' : 'Continuar →'}
                  </Link>
                ) : undefined
              }
              className="border-b border-cobalto/10 px-4 py-3"
            />
            <div className="divide-y divide-cobalto/10">
              {(lessons ?? []).map((lesson, index) => {
                const isCompleted = completedIds.has(lesson.id)
                const hasVideo = !!lesson.bunny_video_id
                return (
                  <Link
                    key={lesson.id}
                    href={`/aluno/cursos/${slug}/aulas/${lesson.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-cal-fundo"
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-cobalto/25" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${isCompleted ? 'text-tinta-suave/70' : 'text-tinta'}`}>
                        {index + 1}. {lesson.title}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {lesson.duration_seconds && (
                        <span className="flex items-center gap-1 text-xs text-tinta-suave/70">
                          <Clock className="h-3 w-3" />
                          {formatDuration(lesson.duration_seconds)}
                        </span>
                      )}
                      {hasVideo ? (
                        <Play className="h-3.5 w-3.5 text-tinta-suave/70" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-cobalto/25" />
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </Panel>

          <div className="flex flex-col gap-4">
            <Notebook
              courseId={course.id}
              studentId={user!.id}
              initialContent={notebook?.content}
            />

            {/* Reembolso (decisão 2.1). Fica discreto e some sozinho quando os
                7 dias passam — não é pra competir com o botão de assistir. */}
            {enrollment.refund_status === 'requested' && (
              <Notice tipo="info" titulo="Reembolso em análise">
                Seu pedido está com a nossa equipe. Respondemos em até 2 dias úteis.
              </Notice>
            )}
            {enrollment.refund_status === 'rejected' && (
              <Notice tipo="atencao" titulo="Reembolso não aprovado">
                Seu acesso ao curso continua liberado. Fale com o suporte se quiser rever o caso.
              </Notice>
            )}
            {enrollment.refund_status === 'none' && diasParaReembolso > 0 && (
              <RefundButton enrollmentId={enrollment.id} diasRestantes={diasParaReembolso} />
            )}
          </div>
        </div>
      </PageBody>
    </>
  )
}
