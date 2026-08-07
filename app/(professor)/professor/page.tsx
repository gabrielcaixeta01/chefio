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
          <h1 className="font-display text-3xl font-extrabold text-tinta tracking-tight">Dashboard</h1>
          <p className="text-tinta-suave mt-1">Bem-vindo à sua área de professor</p>
        </div>
        <Link href="/professor/cursos/novo">
          <Button>+ Novo curso</Button>
        </Link>
      </div>

      {needsStripeOnboarding && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-start gap-3 mb-8">
          <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-800 text-sm font-medium">Configure sua conta de recebimento</p>
            <p className="text-amber-800 text-xs mt-1">Para publicar cursos e receber pagamentos, conecte sua conta Stripe.</p>
          </div>
          <Link href="/professor/onboarding">
            <Button size="sm" variant="secondary">Configurar agora</Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-cal rounded-md border border-cobalto/15 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-tinta-suave">Cursos publicados</p>
            <span className="p-2 rounded-sm text-cobalto bg-cobalto/10"><BookOpen className="h-4 w-4" /></span>
          </div>
          <p className="font-display text-3xl font-extrabold tabular-nums tracking-tight text-tinta">{approvedCourses.length}</p>
        </div>
        <div className="bg-cal rounded-md border border-cobalto/15 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-tinta-suave">Total de alunos</p>
            <span className="p-2 rounded-sm text-cobalto-claro bg-cobalto/10"><Users className="h-4 w-4" /></span>
          </div>
          <p className="font-display text-3xl font-extrabold tabular-nums tracking-tight text-tinta">{enrollments?.length ?? 0}</p>
        </div>
        <div className="bg-cal rounded-md border border-cobalto/15 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-tinta-suave">Ganhos líquidos</p>
            <span className="p-2 rounded-sm text-emerald-600 bg-emerald-50"><DollarSign className="h-4 w-4" /></span>
          </div>
          <p className="font-display text-3xl font-extrabold tabular-nums tracking-tight text-tinta">{formatCurrency(netRevenue)}</p>
          <p className="text-xs text-tinta-suave/70 mt-1">Após {commissionRate}% de comissão da plataforma</p>
        </div>
      </div>

      {pendingCourses.length > 0 && (
        <div className="bg-brasa/10 border border-brasa/30 rounded-md p-4 mb-6">
          <p className="text-brasa-escura text-sm">
            <strong>{pendingCourses.length} curso(s)</strong> aguardando aprovação da plataforma.
          </p>
        </div>
      )}

      <div className="bg-cal rounded-md border border-cobalto/15 p-6">
        <h2 className="font-display font-bold text-tinta mb-4 tracking-tight">Seus cursos</h2>
        {courses?.length === 0 ? (
          <div className="text-center py-8 text-tinta-suave/70">
            <p>Você ainda não criou nenhum curso.</p>
            <Link href="/professor/cursos/novo" className="text-brasa-escura hover:underline text-sm mt-2 inline-block">
              Criar primeiro curso →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {courses?.map((course) => (
              <div key={course.id} className="flex items-center justify-between py-2 border-b border-cobalto/10 last:border-0">
                <span className="text-sm text-tinta">{course.title}</span>
                <div className="flex items-center gap-3">
                  <span className={`rounded-sm px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] ${
                    course.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                    course.status === 'pending_review' ? 'bg-amber-50 text-amber-800' :
                    course.status === 'rejected' ? 'bg-red-50 text-red-700' :
                    'bg-cobalto/10 text-tinta-suave'
                  }`}>
                    {course.status === 'approved' ? 'Publicado' :
                     course.status === 'pending_review' ? 'Em revisão' :
                     course.status === 'rejected' ? 'Rejeitado' : 'Rascunho'}
                  </span>
                  <Link href={`/professor/cursos/${course.id}`} className="text-xs text-brasa-escura hover:underline">
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
