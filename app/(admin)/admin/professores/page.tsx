import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { TeacherActions } from '@/components/admin/TeacherActions'
import { Users } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Professores' }

export default async function AdminTeachersPage() {
  const supabase = await createClient()

  const { data: teachers } = await supabase
    .from('teacher_profiles')
    .select('*, profile:profiles(id, name, avatar_url)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-tinta mb-2 tracking-tight">Professores</h1>
      <p className="text-tinta-suave mb-6">{teachers?.length ?? 0} professor(es) cadastrado(s)</p>

      {!teachers || teachers.length === 0 ? (
        <div className="bg-cal rounded-md border border-cobalto/15 p-16 text-center">
          <Users className="h-10 w-10 text-cobalto/25 mx-auto mb-3" />
          <p className="text-tinta-suave/70 text-sm">Nenhum professor cadastrado.</p>
        </div>
      ) : (
        <div className="bg-cal rounded-md border border-cobalto/15 divide-y divide-cobalto/10">
          {teachers.map((teacher) => {
            const profile = teacher.profile as any
            return (
              <div key={teacher.id} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-cobalto/15 flex items-center justify-center shrink-0 text-sm font-bold text-cobalto-claro">
                  {profile?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-tinta truncate">{profile?.name ?? 'Sem nome'}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-tinta-suave/70">
                      Comissão: <strong>{teacher.commission_rate}%</strong>
                    </span>
                    <span className={`rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] ${
                      teacher.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                      teacher.status === 'suspended' ? 'bg-red-50 text-red-700' :
                      'bg-amber-50 text-amber-800'
                    }`}>
                      {teacher.status === 'active' ? 'Ativo' :
                       teacher.status === 'suspended' ? 'Suspenso' : 'Pendente'}
                    </span>
                    {teacher.stripe_account_id && (
                      <span className="text-xs text-cobalto">Stripe conectado</span>
                    )}
                  </div>
                </div>
                <TeacherActions
                  teacherProfileId={teacher.id}
                  userId={teacher.user_id}
                  currentStatus={teacher.status}
                  currentCommission={teacher.commission_rate}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
