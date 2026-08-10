import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser } from '@/lib/auth/session'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, TrendingUp, Users, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel, SectionHeading } from '@/components/ui/panel'
import { StatTile } from '@/components/ui/stat-tile'
import { EmptyState } from '@/components/ui/empty-state'

export const metadata: Metadata = { title: 'Faturamento' }

const ERROS: Record<string, string> = {
  stripe_nao_configurado: 'Pagamentos estão temporariamente indisponíveis.',
  conta_nao_conectada: 'Conecte sua conta Stripe antes de abrir o painel.',
  onboarding_incompleto: 'Termine o cadastro no Stripe para liberar o painel financeiro.',
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const { erro } = await searchParams
  const supabase = await createClient()
  const user = await getAuthedUser()

  const [{ data: teacherProfile }, { data: payouts }, { data: revenueByCourse }] = await Promise.all([
    supabase
      .from('teacher_profiles')
      .select('stripe_account_id, commission_rate, status')
      .eq('user_id', user!.id)
      .maybeSingle(),
    supabase
      .from('teacher_payouts')
      .select('*')
      .eq('teacher_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.rpc('get_my_teacher_revenue_by_course'),
  ])

  const commissionRate = teacherProfile?.commission_rate ?? 20
  const platformRate = commissionRate / 100

  const soldCourses = (revenueByCourse ?? []).filter((c) => c.sale_count > 0)
  const totalGross = soldCourses.reduce((sum, c) => sum + c.gross, 0)
  const totalSales = soldCourses.reduce((sum, c) => sum + c.sale_count, 0)
  const totalNet = totalGross * (1 - platformRate)

  const courseRevenue: Record<string, { title: string; count: number; gross: number }> =
    Object.fromEntries(
      soldCourses.map((c) => [c.course_id, { title: c.title, count: c.sale_count, gross: c.gross }])
    )

  return (
    <>
      <PageHeader
        olho="Financeiro"
        titulo="Faturamento"
        descricao={`Comissão da plataforma: ${commissionRate}%`}
        acoes={
          teacherProfile?.stripe_account_id ? (
            <a href="/api/stripe/connect/dashboard">
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Dashboard Stripe
              </Button>
            </a>
          ) : undefined
        }
      />

      <PageBody>
        {erro && ERROS[erro] && (
          <Panel className="mb-8 border-red-200 bg-red-50/80 p-4">
            <p className="text-sm text-red-800">{ERROS[erro]}</p>
          </Panel>
        )}

        {!teacherProfile?.stripe_account_id && (
          <Panel className="mb-8 flex flex-wrap items-center justify-between gap-4 border-amber-200 bg-amber-50/80 p-4">
            <p className="text-sm text-amber-800">Configure sua conta Stripe para receber pagamentos.</p>
            <Link href="/professor/onboarding">
              <Button size="sm">Configurar agora</Button>
            </Link>
          </Panel>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile icon={TrendingUp} label="Receita bruta" valor={formatCurrency(totalGross)} destaque />
          <StatTile icon={DollarSign} label="Ganhos líquidos" valor={formatCurrency(totalNet)} nota={`Após ${commissionRate}% de comissão`} />
          <StatTile icon={Users} label="Total de vendas" valor={totalSales} />
        </div>

        {Object.keys(courseRevenue).length > 0 && (
          <Panel className="mb-6 p-0">
            <SectionHeading titulo="Receita por curso" className="border-b border-cobalto/10 px-5 py-4" />
            <div className="divide-y divide-cobalto/10">
              {Object.entries(courseRevenue).map(([courseId, data]) => (
                <div key={courseId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-tinta">{data.title}</p>
                    <p className="text-xs text-tinta-suave/70">{data.count} venda(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-tinta">{formatCurrency(data.gross * (1 - platformRate))}</p>
                    <p className="text-xs text-tinta-suave/70">líquido</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <Panel className="p-0">
          <SectionHeading titulo="Histórico de repasses" className="border-b border-cobalto/10 px-5 py-4" />
          {!payouts || payouts.length === 0 ? (
            <div className="px-5 py-8">
              <EmptyState icon={DollarSign} titulo="Nenhum repasse registrado ainda" descricao="Quando houver pagamentos, eles aparecem aqui com status e data." />
            </div>
          ) : (
            <div className="divide-y divide-cobalto/10">
              {payouts.map((payout) => (
                <div key={payout.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-sm text-tinta">{formatCurrency(payout.amount)}</p>
                    <p className="text-xs text-tinta-suave/70">{new Date(payout.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className={`rounded-sm px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] ${
                    payout.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                    payout.status === 'failed' ? 'bg-red-50 text-red-700' :
                    'bg-amber-50 text-amber-800'
                  }`}>
                    {payout.status === 'paid' ? 'Pago' : payout.status === 'failed' ? 'Falhou' : 'Pendente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </PageBody>
    </>
  )
}
