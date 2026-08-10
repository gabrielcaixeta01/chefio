import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser } from '@/lib/auth/session'
import { getStudentCourses, pickCourseToResume } from '@/lib/data/student-courses'
import { StudentCourseCard, CourseProgressBar } from '@/components/aluno/StudentCourseCard'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { BookOpen, ChefHat, CheckCircle, GraduationCap, Package, PlayCircle } from 'lucide-react'

export const metadata: Metadata = { title: 'Minha área' }

const STATUS_PEDIDO: Record<string, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Pago',
  shipped: 'Enviado',
  delivered: 'Entregue',
}

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
        .select('status')
        .eq('user_id', user!.id)
        .eq('status', 'pending')
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
    <div>
      <div className="mb-8 flex items-center justify-between gap-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-tinta">
            {primeiroNome ? `Olá, ${primeiroNome}` : 'Minha área'}
          </h1>
          <p className="mt-1 text-tinta-suave">Um resumo da sua jornada na cozinha</p>
        </div>
        <Link href="/cursos">
          <Button variant="outline">Explorar mais cursos</Button>
        </Link>
      </div>

      {pendingTeacherProfile && (
        <div className="mb-8 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
          <ChefHat className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800">Seu cadastro como professor está em análise</p>
            <p className="mt-1 text-xs text-amber-700">
              Assim que for aprovado, você ganha acesso à área do professor pra publicar cursos e configurar recebimentos. Enquanto isso, pode usar a plataforma normalmente como aluno.
            </p>
          </div>
        </div>
      )}

      {courses.length === 0 ? (
        <div className="rounded-md border border-cobalto/15 bg-cal py-20 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-cobalto/25" />
          <h2 className="mb-2 font-display text-lg font-bold tracking-tight text-tinta">
            Sua jornada começa aqui
          </h2>
          <p className="mb-6 text-sm text-tinta-suave">
            Você ainda não tem cursos. Explore a biblioteca e escolha o primeiro.
          </p>
          <Link href="/cursos">
            <Button>Ver cursos disponíveis</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Metrica icon={BookOpen} label="Cursos" valor={String(courses.length)} />
            <Metrica icon={PlayCircle} label="Aulas concluídas" valor={String(aulasConcluidas)} />
            <Metrica icon={GraduationCap} label="Cursos concluídos" valor={String(cursosConcluidos)} />
            <Metrica icon={Package} label="Pedidos" valor={String(ordersCount ?? 0)} />
          </div>

          {retomar && (
            <section className="mb-10">
              <h2 className="mb-3 font-display text-lg font-bold tracking-tight text-tinta">
                Continue de onde parou
              </h2>
              <div className="flex flex-col gap-5 rounded-md border border-cobalto/15 bg-cal p-5 sm:flex-row">
                <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-sm bg-cobalto/10 sm:w-64">
                  {retomar.thumbnailUrl ? (
                    <Image src={retomar.thumbnailUrl} alt={retomar.title} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="h-10 w-10 text-cobalto/25" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col">
                  <h3 className="font-display text-xl font-bold tracking-tight text-tinta">{retomar.title}</h3>
                  <p className="mt-1 text-sm text-tinta-suave">por {retomar.teacherName}</p>
                  {retomar.nextLesson && (
                    <p className="mt-3 text-sm text-tinta">
                      <span className="text-tinta-suave/70">Próxima aula · </span>
                      {retomar.nextLesson.position}. {retomar.nextLesson.title}
                    </p>
                  )}
                  <div className="mt-4 max-w-md">
                    <CourseProgressBar course={retomar} />
                  </div>
                  <div className="mt-5">
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

          <section className="mb-10">
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className="font-display text-lg font-bold tracking-tight text-tinta">Seus cursos</h2>
              <Link href="/aluno/cursos" className="text-sm font-medium text-brasa-escura hover:underline">
                Ver todos ({courses.length}) →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.slice(0, 3).map((course) => (
                <StudentCourseCard key={course.id} course={course} />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className="font-display text-lg font-bold tracking-tight text-tinta">Pedidos recentes</h2>
              <Link href="/aluno/pedidos" className="text-sm font-medium text-brasa-escura hover:underline">
                Ver pedidos →
              </Link>
            </div>
            {!orders || orders.length === 0 ? (
              <div className="rounded-md border border-cobalto/15 bg-cal p-8 text-center">
                <Package className="mx-auto mb-3 h-8 w-8 text-cobalto/25" />
                <p className="text-sm text-tinta-suave">
                  Nenhum pedido ainda. Dá uma olhada na{' '}
                  <Link href="/aluno/loja" className="text-brasa-escura hover:underline">
                    loja
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-cobalto/10 rounded-md border border-cobalto/15 bg-cal">
                {orders.map((order) => (
                  <li key={order.id} className="flex items-center gap-3 px-5 py-3.5">
                    <CheckCircle
                      className={`h-4 w-4 shrink-0 ${
                        order.status === 'delivered' ? 'text-emerald-600' : 'text-cobalto/40'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-tinta">{formatCurrency(order.total)}</p>
                      <p className="text-xs text-tinta-suave/70">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-tinta-suave">
                      {STATUS_PEDIDO[order.status] ?? order.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function Metrica({
  icon: Icon,
  label,
  valor,
}: {
  icon: typeof BookOpen
  label: string
  valor: string
}) {
  return (
    <div className="rounded-md border border-cobalto/15 bg-cal p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-tinta-suave/70">
          {label}
        </span>
        <Icon className="h-4 w-4 text-cobalto/40" />
      </div>
      <p className="font-display text-2xl font-extrabold tracking-tight text-tinta">{valor}</p>
    </div>
  )
}
