import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, TrendingUp, Users } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Financeiro' }

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
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('teacher_payouts')
      .select('amount, status, created_at, teacher:profiles(name)')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const totals = totalsRows?.[0]
  const totalGross = totals?.total_gross ?? 0
  const totalPayouts = totals?.total_payouts ?? 0
  const totalSales = totals?.total_sales ?? 0
  const platformRevenue = totalGross - totalPayouts

  const sortedMonths: [string, number][] = (monthlyRows ?? []).map((r) => [r.month, r.total])
  const maxMonthly = Math.max(...sortedMonths.map(([, v]) => v), 1)

  const MONTH_NAMES: Record<string, string> = {
    '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
    '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-tinta mb-2 tracking-tight">Financeiro</h1>
      <p className="text-tinta-suave mb-8">Receitas e repasses da plataforma</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-cal rounded-md border border-cobalto/15 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-tinta-suave">Receita bruta total</p>
            <TrendingUp className="h-4 w-4 text-tinta-suave/70" />
          </div>
          <p className="font-display text-3xl font-extrabold tabular-nums tracking-tight text-tinta">{formatCurrency(totalGross)}</p>
          <p className="text-xs text-tinta-suave/70 mt-1">{totalSales} vendas</p>
        </div>
        <div className="bg-cal rounded-md border border-cobalto/15 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-tinta-suave">Comissão da plataforma</p>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="font-display text-3xl font-extrabold tabular-nums tracking-tight text-emerald-700">{formatCurrency(platformRevenue)}</p>
        </div>
        <div className="bg-cal rounded-md border border-cobalto/15 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-tinta-suave">Repasses a professores</p>
            <Users className="h-4 w-4 text-tinta-suave/70" />
          </div>
          <p className="font-display text-3xl font-extrabold tabular-nums tracking-tight text-tinta">{formatCurrency(totalPayouts)}</p>
        </div>
      </div>

      {/* Gráfico de barras mensal */}
      {sortedMonths.length > 0 && (
        <div className="bg-cal rounded-md border border-cobalto/15 p-6 mb-6">
          <h2 className="font-display font-bold text-tinta mb-6 tracking-tight">Receita mensal</h2>
          <div className="flex items-end gap-3 h-40">
            {sortedMonths.map(([month, value]) => {
              const pct = (value / maxMonthly) * 100
              const [year, mm] = month.split('-')
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-tinta-suave">{formatCurrency(value)}</span>
                  <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                    <div
                      className="w-full bg-brasa-clara rounded-t-md transition-all"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <span className="text-xs text-tinta-suave/70">{MONTH_NAMES[mm]}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Últimas vendas */}
      <div className="bg-cal rounded-md border border-cobalto/15 p-6 mb-6">
        <h2 className="font-display font-bold text-tinta mb-4 tracking-tight">Últimas vendas</h2>
        {!recentSales || recentSales.length === 0 ? (
          <p className="text-sm text-tinta-suave/70 text-center py-6">Nenhuma venda ainda.</p>
        ) : (
          <div className="space-y-2">
            {recentSales.map((e, i) => {
              const course = e.course as any
              return (
                <div key={i} className="flex items-center justify-between py-2 border-b border-cobalto/10 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-tinta">{course?.title ?? '—'}</p>
                    <p className="text-xs text-tinta-suave/70">
                      {course?.teacher?.name ?? '—'} ·{' '}
                      {new Date(e.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-tinta">
                    {e.amount_paid === 0 ? 'Grátis' : formatCurrency(e.amount_paid ?? 0)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Repasses pendentes */}
      <div className="bg-cal rounded-md border border-cobalto/15 p-6">
        <h2 className="font-display font-bold text-tinta mb-4 tracking-tight">Repasses recentes</h2>
        {!payouts || payouts.length === 0 ? (
          <p className="text-sm text-tinta-suave/70 text-center py-6">Nenhum repasse registrado.</p>
        ) : (
          <div className="space-y-2">
            {payouts.map((p) => (
              <div key={p.created_at} className="flex items-center justify-between py-2 border-b border-cobalto/10 last:border-0">
                <div>
                  <p className="text-sm font-medium text-tinta">{(p.teacher as any)?.name ?? '—'}</p>
                  <p className="text-xs text-tinta-suave/70">{new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{formatCurrency(p.amount)}</span>
                  <span className={`rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] ${
                    p.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                    p.status === 'failed' ? 'bg-red-50 text-red-700' :
                    'bg-amber-50 text-amber-800'
                  }`}>
                    {p.status === 'paid' ? 'Pago' : p.status === 'failed' ? 'Falhou' : 'Pendente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
