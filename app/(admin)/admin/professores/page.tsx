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
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Professores</h1>
      <p className="text-gray-500 mb-6">{teachers?.length ?? 0} professor(es) cadastrado(s)</p>

      {!teachers || teachers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nenhum professor cadastrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {teachers.map((teacher) => {
            const profile = teacher.profile as any
            return (
              <div key={teacher.id} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0 text-sm font-bold text-purple-600">
                  {profile?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{profile?.name ?? 'Sem nome'}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400">
                      Comissão: <strong>{teacher.commission_rate}%</strong>
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      teacher.status === 'active' ? 'bg-green-100 text-green-700' :
                      teacher.status === 'suspended' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {teacher.status === 'active' ? 'Ativo' :
                       teacher.status === 'suspended' ? 'Suspenso' : 'Pendente'}
                    </span>
                    {teacher.stripe_account_id && (
                      <span className="text-xs text-blue-600">Stripe conectado</span>
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
