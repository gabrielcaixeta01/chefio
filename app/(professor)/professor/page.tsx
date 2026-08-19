import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, COMISSAO_PADRAO } from '@/lib/utils'
import { BookOpen, Users, DollarSign, Clock, CreditCard, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel, SectionHeading } from '@/components/ui/panel'
import { StatTile } from '@/components/ui/stat-tile'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { StatusBadge } from '@/components/ui/status-badge'

export const metadata: Metadata = { title: 'Painel do professor' }

export default async function ProfessorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: courses },
    { data: teacherProfile },
  ] = await Promise.all([
    supabase.from('courses').select('id, title, status, price').eq('teacher_id', user!.id),
    supabase.from('teacher_profiles').select('*').eq('user_id', user!.id).maybeSingle(),
  ])

  const approvedCourses = courses?.filter((c) => c.status === 'approved') ?? []
  const pendingCourses = courses?.filter((c) => c.status === 'pending_review') ?? []

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('amount_paid, course_id')
    .in('course_id', (courses ?? []).map((c) => c.id))

  const grossRevenue = (enrollments ?? []).reduce((sum, e) => sum + (e.amount_paid ?? 0), 0)
  const commissionRate = teacherProfile?.commission_rate ?? COMISSAO_PADRAO
  const netRevenue = grossRevenue * (1 - commissionRate / 100)

  const needsStripeOnboarding = !teacherProfile?.stripe_account_id

  return (
    <>
      <PageHeader
        olho="Painel"
        titulo="Dashboard"
        descricao="Bem-vindo à sua área de professor"
        acoes={
          <Link href="/professor/cursos/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo curso
            </Button>
          </Link>
        }
      />

      <PageBody>
        {needsStripeOnboarding && (
          <Notice
            tipo="atencao"
            icon={CreditCard}
            titulo="Configure sua conta de recebimento"
            className="mb-8"
            acao={
              <Link href="/professor/onboarding">
                <Button size="sm">Configurar agora</Button>
              </Link>
            }
          >
            Sem uma conta Stripe conectada você não consegue publicar cursos pagos nem receber.
          </Notice>
        )}

        {pendingCourses.length > 0 && (
          <Notice tipo="info" icon={Clock} className="mb-8">
            <strong className="font-semibold">
              {pendingCourses.length} {pendingCourses.length === 1 ? 'curso' : 'cursos'}
            </strong>{' '}
            aguardando aprovação da plataforma. Você é avisado assim que a revisão sair.
          </Notice>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile icon={BookOpen} label="Cursos publicados" valor={approvedCourses.length} destaque />
          <StatTile icon={Users} label="Total de alunos" valor={enrollments?.length ?? 0} />
          <StatTile icon={DollarSign} label="Ganhos líquidos" valor={formatCurrency(netRevenue)} nota={`Após ${commissionRate}% de comissão`} />
        </div>

        <Panel>
          <SectionHeading
            titulo="Seus cursos"
            acao={<Link href="/professor/cursos" className="text-sm font-semibold text-brasa-escura hover:underline">Ver todos</Link>}
            className="border-b border-cobalto/10 px-5 py-4"
          />
          {courses?.length === 0 ? (
            <div className="px-5 py-8">
              <EmptyState
                icon={BookOpen}
                titulo="Você ainda não criou nenhum curso"
                descricao="Publique seu primeiro curso e comece a ensinar na Chefio."
                acao={
                  <Link href="/professor/cursos/novo">
                    <Button>Criar primeiro curso</Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-cobalto/10">
              {courses?.map((course) => (
                <li key={course.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4">
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate text-sm font-medium text-tinta">{course.title}</p>
                    <p className="mt-1 text-xs text-tinta-suave/70">{course.price === 0 ? 'Grátis' : formatCurrency(course.price)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge tipo="curso" status={course.status} />
                    <Link href={`/professor/cursos/${course.id}`} className="text-xs font-semibold text-brasa-escura underline-offset-4 hover:underline">
                      Editar
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </PageBody>
    </>
  )
}
