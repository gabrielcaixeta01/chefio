import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { BookOpen, Users, DollarSign, Clock } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Uma RPC no lugar de 5 round trips — a soma de amount_paid roda no
  // Postgres, não puxa a tabela de enrollments inteira pro Node.
  const { data: statsRows } = await supabase.rpc('get_admin_dashboard_stats')
  const s = statsRows?.[0]

  const totalCourses = s?.total_courses ?? 0
  const pendingCourses = s?.pending_courses ?? 0
  const totalTeachers = s?.total_teachers ?? 0
  const totalStudents = s?.total_students ?? 0
  const totalRevenue = s?.total_revenue ?? 0

  const stats = [
    { label: 'Receita Total', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Cursos Aprovados', value: totalCourses ?? 0, icon: BookOpen, color: 'text-cobalto bg-cobalto/10' },
    { label: 'Professores', value: totalTeachers ?? 0, icon: Users, color: 'text-cobalto-claro bg-cobalto/10' },
    { label: 'Revisões Pendentes', value: pendingCourses ?? 0, icon: Clock, color: 'text-brasa-escura bg-brasa/10' },
  ]

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-tinta mb-2 tracking-tight">Dashboard</h1>
      <p className="text-tinta-suave mb-8">Visão geral da plataforma Chefio</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-cal rounded-md border border-cobalto/15 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-tinta-suave">{stat.label}</p>
                <span className={`p-2 rounded-sm ${stat.color}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="font-display text-3xl font-extrabold tabular-nums tracking-tight text-tinta">{stat.value}</p>
            </div>
          )
        })}
      </div>

      {pendingCourses ? (
        <div className="bg-brasa/10 border border-brasa/30 rounded-md p-4 flex items-center justify-between">
          <p className="text-brasa-escura text-sm font-medium">
            {pendingCourses} curso(s) aguardando revisão
          </p>
          <a href="/admin/cursos" className="text-brasa-escura text-sm font-semibold hover:underline">
            Revisar agora →
          </a>
        </div>
      ) : null}

      <div className="mt-8 text-center text-tinta-suave/70 text-sm">
        Alunos cadastrados: <span className="font-semibold text-tinta-suave">{totalStudents ?? 0}</span>
      </div>
    </div>
  )
}
