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
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Financeiro</h1>
      <p className="text-gray-500 mb-8">Receitas e repasses da plataforma</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Receita bruta total</p>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalGross)}</p>
          <p className="text-xs text-gray-400 mt-1">{totalSales} vendas</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Comissão da plataforma</p>
            <DollarSign className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(platformRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Repasses a professores</p>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPayouts)}</p>
        </div>
      </div>

      {/* Gráfico de barras mensal */}
      {sortedMonths.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-6">Receita mensal</h2>
          <div className="flex items-end gap-3 h-40">
            {sortedMonths.map(([month, value]) => {
              const pct = (value / maxMonthly) * 100
              const [year, mm] = month.split('-')
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{formatCurrency(value)}</span>
                  <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                    <div
                      className="w-full bg-orange-400 rounded-t-md transition-all"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{MONTH_NAMES[mm]}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Últimas vendas */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Últimas vendas</h2>
        {!recentSales || recentSales.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nenhuma venda ainda.</p>
        ) : (
          <div className="space-y-2">
            {recentSales.map((e, i) => {
              const course = e.course as any
              return (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{course?.title ?? '—'}</p>
                    <p className="text-xs text-gray-400">
                      {course?.teacher?.name ?? '—'} ·{' '}
                      {new Date(e.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {e.amount_paid === 0 ? 'Grátis' : formatCurrency(e.amount_paid ?? 0)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Repasses pendentes */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Repasses recentes</h2>
        {!payouts || payouts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nenhum repasse registrado.</p>
        ) : (
          <div className="space-y-2">
            {payouts.map((p) => (
              <div key={p.created_at} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{(p.teacher as any)?.name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{formatCurrency(p.amount)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.status === 'paid' ? 'bg-green-100 text-green-700' :
                    p.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
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
