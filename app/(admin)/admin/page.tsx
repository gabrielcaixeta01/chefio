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
    { label: 'Receita Total', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-green-600 bg-green-50' },
    { label: 'Cursos Aprovados', value: totalCourses ?? 0, icon: BookOpen, color: 'text-blue-600 bg-blue-50' },
    { label: 'Professores', value: totalTeachers ?? 0, icon: Users, color: 'text-purple-600 bg-purple-50' },
    { label: 'Revisões Pendentes', value: pendingCourses ?? 0, icon: Clock, color: 'text-orange-600 bg-orange-50' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-500 mb-8">Visão geral da plataforma Chefio</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <span className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          )
        })}
      </div>

      {pendingCourses ? (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-orange-800 text-sm font-medium">
            {pendingCourses} curso(s) aguardando revisão
          </p>
          <a href="/admin/cursos" className="text-orange-600 text-sm font-semibold hover:underline">
            Revisar agora →
          </a>
        </div>
      ) : null}

      <div className="mt-8 text-center text-gray-400 text-sm">
        Alunos cadastrados: <span className="font-semibold text-gray-600">{totalStudents ?? 0}</span>
      </div>
    </div>
  )
}
