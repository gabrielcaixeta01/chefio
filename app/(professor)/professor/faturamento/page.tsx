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

  const [{ data: teacherProfile }, { data: courses }, { data: payouts }] = await Promise.all([
    supabase
      .from('teacher_profiles')
      .select('stripe_account_id, commission_rate, status')
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('courses')
      .select('id, title, price')
      .eq('teacher_id', user!.id),
    supabase
      .from('teacher_payouts')
      .select('*')
      .eq('teacher_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const commissionRate = teacherProfile?.commission_rate ?? 20
  const platformRate = commissionRate / 100

  const courseIds = (courses ?? []).map((c) => c.id)

  // Get enrollments
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, amount_paid, course_id, created_at')
    .in('course_id', courseIds.length > 0 ? courseIds : ['none'])
    .order('created_at', { ascending: false })

  const totalGross = (enrollments ?? []).reduce((sum, e) => sum + (e.amount_paid ?? 0), 0)
  const totalNet = totalGross * (1 - platformRate)
  const platformFee = totalGross * platformRate

  // Group by course
  const courseMap = Object.fromEntries((courses ?? []).map((c) => [c.id, c]))
  const courseRevenue: Record<string, { title: string; count: number; gross: number }> = {}
  for (const e of enrollments ?? []) {
    if (!courseRevenue[e.course_id]) {
      courseRevenue[e.course_id] = {
        title: courseMap[e.course_id]?.title ?? 'Curso removido',
        count: 0,
        gross: 0,
      }
    }
    courseRevenue[e.course_id].count++
    courseRevenue[e.course_id].gross += e.amount_paid ?? 0
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faturamento</h1>
          <p className="text-gray-500 mt-1">Comissão da plataforma: {commissionRate}%</p>
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
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between mb-8">
          <p className="text-yellow-800 text-sm">Configure sua conta Stripe para receber pagamentos.</p>
          <Link href="/professor/onboarding">
            <Button size="sm">Configurar agora</Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Receita bruta</p>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalGross)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Ganhos líquidos</p>
            <DollarSign className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalNet)}</p>
          <p className="text-xs text-gray-400 mt-1">Após {commissionRate}% de comissão</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Total de vendas</p>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{enrollments?.length ?? 0}</p>
        </div>
      </div>

      {Object.keys(courseRevenue).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Receita por curso</h2>
          <div className="space-y-3">
            {Object.entries(courseRevenue).map(([courseId, data]) => (
              <div key={courseId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{data.title}</p>
                  <p className="text-xs text-gray-400">{data.count} venda(s)</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(data.gross * (1 - platformRate))}</p>
                  <p className="text-xs text-gray-400">líquido</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Histórico de repasses</h2>
        {!payouts || payouts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhum repasse registrado ainda.</p>
        ) : (
          <div className="space-y-2">
            {payouts.map((payout) => (
              <div key={payout.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm text-gray-900">{formatCurrency(payout.amount)}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(payout.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  payout.status === 'paid' ? 'bg-green-100 text-green-700' :
                  payout.status === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
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
