import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser } from '@/lib/auth/session'
import { getStudentCourses, pickCourseToResume } from '@/lib/data/student-courses'
import { StudentCourseCard, CourseProgressBar } from '@/components/aluno/StudentCourseCard'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Panel, SectionHeading } from '@/components/ui/panel'
import { StatTile } from '@/components/ui/stat-tile'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { Ladrilho } from '@/components/ui/ladrilho'
import { statusLabel } from '@/components/ui/status-badge'
import { formatCurrency } from '@/lib/utils'
import { BookOpen, ChefHat, CheckCircle, GraduationCap, Package, PlayCircle } from 'lucide-react'

export const metadata: Metadata = { title: 'Minha área' }

export default async function AlunoDashboard() {
  const supabase = await createClient()
  const user = await getAuthedUser()

  const [courses, { data: profile }, { data: pendingTeacherProfile }, { data: orders, count: ordersCount }] =
    await Promise.all([
      getStudentCourses(user!.id),
      supabase.from('profiles').select('name').eq('id', user!.id).maybeSingle(),
      // Quem pediu pra ser professor no cadastro continua com role='student'
      // até o admin aprovar (ver 00003_security_fixes.sql) — não tem acesso a
      // /professor/* nesse meio tempo, então o aviso mora aqui.
      supabase
        .from('teacher_profiles')
        .select('status, submitted_at, rejection_reason')
        .eq('user_id', user!.id)
        .in('status', ['pending', 'rejected'])
        .maybeSingle(),
      supabase
        .from('orders')
        .select('id, status, total, created_at', { count: 'exact' })
        .eq('student_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(3),
    ])

  const primeiroNome = profile?.name?.split(' ')[0]
  const retomar = pickCourseToResume(courses)
  const aulasConcluidas = courses.reduce((soma, c) => soma + c.completedLessons, 0)
  const cursosConcluidos = courses.filter((c) => c.status === 'concluido').length

  return (
    <>
      <PageHeader
        olho="Minha área"
        titulo={primeiroNome ? `Olá, ${primeiroNome}` : 'Sua cozinha'}
        descricao="O que está em andamento, o que chegou e o que falta assistir."
        acoes={
          <Link href="/cursos">
            <Button variant="outline">Explorar cursos</Button>
          </Link>
        }
      />

      <PageBody>
        {/* Três estados diferentes, e o mais importante é o do meio: quem se
            cadastrou como chef e nunca preencheu a candidatura ficava esperando
            uma análise que nunca ia acontecer, porque não havia o que analisar
            (decisão 4.2). */}
        {pendingTeacherProfile && (
          <Notice
            tipo="atencao"
            icon={ChefHat}
            titulo={
              pendingTeacherProfile.status === 'rejected'
                ? 'Sua candidatura a professor foi recusada'
                : pendingTeacherProfile.submitted_at
                  ? 'Sua candidatura a professor está em análise'
                  : 'Falta enviar sua candidatura a professor'
            }
            className="mb-8"
            acao={
              <Link href="/aluno/candidatura">
                <Button size="sm" variant="outline">
                  {pendingTeacherProfile.submitted_at ? 'Ver candidatura' : 'Preencher agora'}
                </Button>
              </Link>
            }
          >
            {pendingTeacherProfile.status === 'rejected'
              ? pendingTeacherProfile.rejection_reason ??
                'Você pode corrigir os dados e enviar de novo.'
              : pendingTeacherProfile.submitted_at
                ? 'Assim que for aprovada, você ganha acesso à área do professor pra publicar cursos e configurar recebimentos. Enquanto isso, pode usar a plataforma normalmente como aluno.'
                : 'A gente precisa de documento, contato e um resumo da sua experiência antes de liberar a publicação de cursos.'}
          </Notice>
        )}

        {courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            titulo="Sua jornada começa aqui"
            descricao="Você ainda não tem cursos. Escolha o primeiro no catálogo e comece a cozinhar hoje."
            acao={
              <Link href="/cursos">
                <Button>Ver cursos disponíveis</Button>
              </Link>
            }
          />
        ) : (
          <>
            {/* ---------- Retomar: o motivo de o aluno voltar ----------
                Roda sobre a parede de azulejo porque é o único bloco da página
                que precisa ser visto antes de qualquer outro. */}
            {retomar && (
              <section className="azulejo-escuro relative mb-10 overflow-hidden rounded-md [--azulejo-tamanho:72px]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-linear-to-r from-cobalto-escuro/92 via-cobalto-escuro/80 to-cobalto-escuro/55"
                />
                <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-7">
                  <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-sm bg-cobalto-escuro sm:w-60">
                    {retomar.thumbnailUrl ? (
                      <Image src={retomar.thumbnailUrl} alt={retomar.title} fill className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-cal/25" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="olho text-brasa-clara">Continue de onde parou</p>
                    <h2 className="mt-2.5 font-display text-2xl font-extrabold tracking-tight text-cal">
                      {retomar.title}
                    </h2>
                    <p className="mt-1 text-sm text-cal/60">por {retomar.teacherName}</p>

                    {retomar.nextLesson && (
                      <p className="mt-4 flex items-center gap-2 text-sm text-cal">
                        <Ladrilho tom="apagado" tamanho="sm">
                          <PlayCircle className="h-4 w-4" aria-hidden="true" />
                        </Ladrilho>
                        <span className="truncate">
                          <span className="text-cal/55">Próxima aula · </span>
                          {retomar.nextLesson.position}. {retomar.nextLesson.title}
                        </span>
                      </p>
                    )}

                    <div className="mt-5 max-w-md">
                      <CourseProgressBar course={retomar} tom="escuro" />
                    </div>

                    <div className="mt-6">
                      <Link
                        href={
                          retomar.nextLesson
                            ? `/aluno/cursos/${retomar.slug}/aulas/${retomar.nextLesson.id}`
                            : `/aluno/cursos/${retomar.slug}`
                        }
                      >
                        <Button>
                          {retomar.completedLessons === 0 ? 'Começar curso' : 'Continuar assistindo'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatTile icon={BookOpen} label="Cursos" valor={courses.length} />
              <StatTile icon={PlayCircle} label="Aulas concluídas" valor={aulasConcluidas} />
              <StatTile icon={GraduationCap} label="Cursos concluídos" valor={cursosConcluidos} />
              <StatTile icon={Package} label="Pedidos" valor={ordersCount ?? 0} />
            </div>

            <section className="mb-10">
              <SectionHeading
                titulo="Seus cursos"
                acao={
                  <Link
                    href="/aluno/cursos"
                    className="text-sm font-semibold text-cobalto underline-offset-4 hover:underline"
                  >
                    Ver todos ({courses.length}) →
                  </Link>
                }
              />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {courses.slice(0, 3).map((course) => (
                  <StudentCourseCard key={course.id} course={course} />
                ))}
              </div>
            </section>

            <section>
              <SectionHeading
                titulo="Pedidos recentes"
                acao={
                  <Link
                    href="/aluno/pedidos"
                    className="text-sm font-semibold text-cobalto underline-offset-4 hover:underline"
                  >
                    Ver pedidos →
                  </Link>
                }
              />
              {!orders || orders.length === 0 ? (
                <EmptyState
                  icon={Package}
                  titulo="Nenhum pedido ainda"
                  descricao="Os ingredientes e utensílios de cada aula ficam na loja, a um clique."
                  acao={
                    <Link href="/aluno/loja">
                      <Button variant="outline">Ir para a loja</Button>
                    </Link>
                  }
                />
              ) : (
                <Panel>
                  <ul className="divide-y divide-cobalto/10">
                    {orders.map((order) => (
                      <li key={order.id} className="flex items-center gap-3 px-5 py-4">
                        <CheckCircle
                          aria-hidden="true"
                          className={`h-4 w-4 shrink-0 ${
                            order.status === 'delivered' ? 'text-emerald-600' : 'text-cobalto/40'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-tinta">{formatCurrency(order.total)}</p>
                          <p className="text-xs text-tinta-suave/70">
                            {new Date(order.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-tinta-suave">
                          {statusLabel('pedido', order.status)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
            </section>
          </>
        )}
      </PageBody>
    </>
  )
}
