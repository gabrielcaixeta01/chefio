import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { BookOpen, Users, DollarSign, AlertCircle, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel, SectionHeading } from '@/components/ui/panel'
import { StatTile } from '@/components/ui/stat-tile'
import { EmptyState } from '@/components/ui/empty-state'

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
  const commissionRate = teacherProfile?.commission_rate ?? 20
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
          <Panel className="mb-8 flex flex-wrap items-start justify-between gap-4 border-amber-200 bg-amber-50/80 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <p className="text-sm font-medium text-amber-800">Configure sua conta de recebimento</p>
                <p className="mt-1 text-xs text-amber-700">Para publicar cursos e receber pagamentos, conecte sua conta Stripe.</p>
              </div>
            </div>
            <Link href="/professor/onboarding">
              <Button size="sm" variant="secondary">Configurar agora</Button>
            </Link>
          </Panel>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile icon={BookOpen} label="Cursos publicados" valor={approvedCourses.length} destaque />
          <StatTile icon={Users} label="Total de alunos" valor={enrollments?.length ?? 0} />
          <StatTile icon={DollarSign} label="Ganhos líquidos" valor={formatCurrency(netRevenue)} nota={`Após ${commissionRate}% de comissão`} />
        </div>

        {pendingCourses.length > 0 && (
          <Panel className="mb-6 border-brasa/30 bg-brasa/10 p-4">
            <p className="text-sm text-brasa-escura">
              <strong>{pendingCourses.length} curso(s)</strong> aguardando aprovação da plataforma.
            </p>
          </Panel>
        )}

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
            <div className="divide-y divide-cobalto/10">
              {courses?.map((course) => (
                <div key={course.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-tinta">{course.title}</p>
                    <p className="mt-1 text-xs text-tinta-suave/70">{course.price === 0 ? 'Grátis' : formatCurrency(course.price)}</p>
                  </div>
                  <div className="flex items-center gap-3">
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
                    <Link href={`/professor/cursos/${course.id}`} className="text-xs font-semibold text-brasa-escura hover:underline">
                      Editar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </PageBody>
    </>
  )
}
