import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser } from '@/lib/auth/session'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, TrendingUp, Users, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Faturamento' }

export default async function BillingPage() {
  const supabase = await createClient()
  const user = await getAuthedUser()

  // Receita por curso agrupada no Postgres (RPC filtra por auth.uid()
  // internamente, não recebe o id como parâmetro) — antes isso puxava toda
  // enrollment do professor pra somar/agrupar em JS.
  const [{ data: teacherProfile }, { data: payouts }, { data: revenueByCourse }] = await Promise.all([
    supabase
      .from('teacher_profiles')
      .select('stripe_account_id, commission_rate, status')
      .eq('user_id', user!.id)
      .single(),
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
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tinta">Faturamento</h1>
          <p className="text-tinta-suave mt-1">Comissão da plataforma: {commissionRate}%</p>
        </div>
        {teacherProfile?.stripe_account_id && (
          <a
            href={`https://dashboard.stripe.com/`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Dashboard Stripe
            </Button>
          </a>
        )}
      </div>

      {!teacherProfile?.stripe_account_id && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-center justify-between mb-8">
          <p className="text-amber-800 text-sm">Configure sua conta Stripe para receber pagamentos.</p>
          <Link href="/professor/onboarding">
            <Button size="sm">Configurar agora</Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-md border border-cobalto/15 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-tinta-suave">Receita bruta</p>
            <TrendingUp className="h-4 w-4 text-tinta-suave/70" />
          </div>
          <p className="text-2xl font-bold text-tinta">{formatCurrency(totalGross)}</p>
        </div>
        <div className="bg-white rounded-md border border-cobalto/15 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-tinta-suave">Ganhos líquidos</p>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalNet)}</p>
          <p className="text-xs text-tinta-suave/70 mt-1">Após {commissionRate}% de comissão</p>
        </div>
        <div className="bg-white rounded-md border border-cobalto/15 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-tinta-suave">Total de vendas</p>
            <Users className="h-4 w-4 text-tinta-suave/70" />
          </div>
          <p className="text-2xl font-bold text-tinta">{totalSales}</p>
        </div>
      </div>

      {Object.keys(courseRevenue).length > 0 && (
        <div className="bg-white rounded-md border border-cobalto/15 p-6 mb-6">
          <h2 className="font-semibold text-tinta mb-4">Receita por curso</h2>
          <div className="space-y-3">
            {Object.entries(courseRevenue).map(([courseId, data]) => (
              <div key={courseId} className="flex items-center justify-between py-2 border-b border-cobalto/10 last:border-0">
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
        </div>
      )}

      <div className="bg-white rounded-md border border-cobalto/15 p-6">
        <h2 className="font-semibold text-tinta mb-4">Histórico de repasses</h2>
        {!payouts || payouts.length === 0 ? (
          <p className="text-sm text-tinta-suave/70 text-center py-8">Nenhum repasse registrado ainda.</p>
        ) : (
          <div className="space-y-2">
            {payouts.map((payout) => (
              <div key={payout.id} className="flex items-center justify-between py-2 border-b border-cobalto/10 last:border-0">
                <div>
                  <p className="text-sm text-tinta">{formatCurrency(payout.amount)}</p>
                  <p className="text-xs text-tinta-suave/70">
                    {new Date(payout.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
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
      </div>
    </div>
  )
}
