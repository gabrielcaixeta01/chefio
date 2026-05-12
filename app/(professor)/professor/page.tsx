import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { BookOpen, Users, DollarSign, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function ProfessorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: courses },
    { data: teacherProfile },
  ] = await Promise.all([
    supabase.from('courses').select('id, title, status, price').eq('teacher_id', user!.id),
    supabase.from('teacher_profiles').select('*').eq('user_id', user!.id).single(),
  ])

  const approvedCourses = courses?.filter(c => c.status === 'approved') ?? []
  const pendingCourses = courses?.filter(c => c.status === 'pending_review') ?? []

  // Calcula ganhos totais
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('amount_paid, course_id')
    .in('course_id', (courses ?? []).map(c => c.id))

  const grossRevenue = (enrollments ?? []).reduce((sum, e) => sum + (e.amount_paid ?? 0), 0)
  const commissionRate = teacherProfile?.commission_rate ?? 20
  const netRevenue = grossRevenue * (1 - commissionRate / 100)

  const needsStripeOnboarding = !teacherProfile?.stripe_account_id

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Bem-vindo à sua área de professor</p>
        </div>
        <Link href="/professor/cursos/novo">
          <Button>+ Novo curso</Button>
        </Link>
      </div>

      {needsStripeOnboarding && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3 mb-8">
          <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-yellow-800 text-sm font-medium">Configure sua conta de recebimento</p>
            <p className="text-yellow-700 text-xs mt-1">Para publicar cursos e receber pagamentos, conecte sua conta Stripe.</p>
          </div>
          <Link href="/professor/onboarding">
            <Button size="sm" variant="secondary">Configurar agora</Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">Cursos publicados</p>
            <span className="p-2 rounded-lg text-blue-600 bg-blue-50"><BookOpen className="h-4 w-4" /></span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{approvedCourses.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">Total de alunos</p>
            <span className="p-2 rounded-lg text-purple-600 bg-purple-50"><Users className="h-4 w-4" /></span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{enrollments?.length ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">Ganhos líquidos</p>
            <span className="p-2 rounded-lg text-green-600 bg-green-50"><DollarSign className="h-4 w-4" /></span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(netRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">Após {commissionRate}% de comissão da plataforma</p>
        </div>
      </div>

      {pendingCourses.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <p className="text-orange-800 text-sm">
            <strong>{pendingCourses.length} curso(s)</strong> aguardando aprovação da plataforma.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Seus cursos</h2>
        {courses?.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>Você ainda não criou nenhum curso.</p>
            <Link href="/professor/cursos/novo" className="text-orange-600 hover:underline text-sm mt-2 inline-block">
              Criar primeiro curso →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {courses?.map((course) => (
              <div key={course.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-900">{course.title}</span>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    course.status === 'approved' ? 'bg-green-100 text-green-700' :
                    course.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
                    course.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {course.status === 'approved' ? 'Publicado' :
                     course.status === 'pending_review' ? 'Em revisão' :
                     course.status === 'rejected' ? 'Rejeitado' : 'Rascunho'}
                  </span>
                  <Link href={`/professor/cursos/${course.id}`} className="text-xs text-orange-600 hover:underline">
                    Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
