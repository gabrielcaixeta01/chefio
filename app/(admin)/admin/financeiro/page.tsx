import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel, SectionHeading } from '@/components/ui/panel'
import { StatTile } from '@/components/ui/stat-tile'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { DollarSign, TrendingUp, Users } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Financeiro' }

const MESES: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
}

/** "R$ 12,4 mil" — o valor cheio não cabe em seis colunas num celular. */
function valorCurto(v: number) {
  if (v >= 1000) return `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

export default async function AdminFinancialPage() {
  const supabase = await createClient()

  // Totais e agrupamento mensal rodam no Postgres — antes isso puxava toda
  // a tabela enrollments (e "total de payouts" nem era o total de verdade,
  // só a soma dos últimos 20 que a lista abaixo carrega).
  const [{ data: totalsRows }, { data: monthlyRows }, { data: recentSales }, { data: payouts }] = await Promise.all([
    supabase.rpc('get_admin_financial_totals'),
    supabase.rpc('get_admin_monthly_revenue', { months_back: 6 }),
    supabase
      .from('enrollments')
      .select('amount_paid, created_at, course:courses(title, teacher_id, teacher:profiles(name))')
      // Venda reembolsada não é receita — sai também da lista (decisão 2.2).
      .is('refunded_at', null)
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('teacher_payouts')
      .select('id, amount, status, created_at, teacher:profiles(name)')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const totals = totalsRows?.[0]
  const totalGross = totals?.total_gross ?? 0
  const totalPayouts = totals?.total_payouts ?? 0
  const totalSales = totals?.total_sales ?? 0
  const platformRevenue = totalGross - totalPayouts

  const meses: [string, number][] = (monthlyRows ?? []).map((r) => [r.month, r.total])
  const maxMensal = Math.max(...meses.map(([, v]) => v), 1)

  return (
    <>
      <PageHeader
        olho="Administração"
        titulo="Financeiro"
        descricao="Quanto entrou, quanto ficou com a plataforma e quanto foi repassado aos chefs."
      />

      <PageBody>
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile
            icon={TrendingUp}
            label="Receita bruta"
            valor={formatCurrency(totalGross)}
            nota={`${totalSales} ${totalSales === 1 ? 'venda' : 'vendas'}`}
            destaque
          />
          <StatTile
            icon={DollarSign}
            label="Comissão da plataforma"
            valor={formatCurrency(platformRevenue)}
            nota={totalGross > 0 ? `${Math.round((platformRevenue / totalGross) * 100)}% do bruto` : undefined}
          />
          <StatTile icon={Users} label="Repasses a professores" valor={formatCurrency(totalPayouts)} />
        </div>

        {meses.length > 0 && (
          <Panel className="mb-6 p-5 sm:p-6">
            <SectionHeading titulo="Receita mensal" />
            {/* Colunas de largura igual com min-w-0: sem isso o rótulo de valor
                empurrava a barra e o gráfico estourava a largura no celular. */}
            <div className="flex h-44 items-end gap-2 sm:gap-3">
              {meses.map(([mes, valor]) => {
                const pct = (valor / maxMensal) * 100
                const [, mm] = mes.split('-')
                return (
                  <div key={mes} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <span
                      className="w-full truncate text-center text-[0.625rem] tabular-nums text-tinta-suave sm:text-xs"
                      title={formatCurrency(valor)}
                    >
                      {valorCurto(valor)}
                    </span>
                    <div className="flex h-full w-full items-end">
                      <div
                        className="w-full rounded-t-sm bg-brasa"
                        style={{ height: `${Math.max(pct, 3)}%` }}
                      />
                    </div>
                    <span className="olho text-[0.625rem] text-tinta-suave/70">{MESES[mm] ?? mm}</span>
                  </div>
                )
              })}
            </div>
          </Panel>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel>
            <SectionHeading titulo="Últimas vendas" className="border-b border-cobalto/10 px-5 py-4" />
            {!recentSales || recentSales.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-tinta-suave/70">Nenhuma venda ainda.</p>
            ) : (
              <ul className="divide-y divide-cobalto/10">
                {recentSales.map((e, i) => {
                  const course = e.course as any
                  return (
                    <li key={i} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-tinta">{course?.title ?? '—'}</p>
                        <p className="truncate text-xs text-tinta-suave/70">
                          {course?.teacher?.name ?? '—'} ·{' '}
                          {new Date(e.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-tinta">
                        {e.amount_paid === 0 ? 'Grátis' : formatCurrency(e.amount_paid ?? 0)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>

          <Panel>
            <SectionHeading titulo="Repasses recentes" className="border-b border-cobalto/10 px-5 py-4" />
            {!payouts || payouts.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={DollarSign}
                  titulo="Nenhum repasse registrado"
                  descricao="Os pagamentos aos chefs aparecem aqui com status e data."
                />
              </div>
            ) : (
              <ul className="divide-y divide-cobalto/10">
                {payouts.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="truncate text-sm font-medium text-tinta">{(p.teacher as any)?.name ?? '—'}</p>
                      <p className="text-xs text-tinta-suave/70">
                        {new Date(p.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-tinta">
                      {formatCurrency(p.amount)}
                    </span>
                    <StatusBadge tipo="repasse" status={p.status} className="shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </PageBody>
    </>
  )
}
