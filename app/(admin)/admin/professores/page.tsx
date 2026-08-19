import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser, isOwner } from '@/lib/auth/session'
import { TeacherActions } from '@/components/admin/TeacherActions'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel } from '@/components/ui/panel'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { Ladrilho } from '@/components/ui/ladrilho'
import { Users } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Professores' }

export default async function AdminTeachersPage() {
  const supabase = await createClient()

  const podeEditarComissao = isOwner(await getAuthedUser())

  const { data: teachers } = await supabase
    .from('teacher_profiles')
    .select('*, profile:profiles(id, name, avatar_url)')
    .order('created_at', { ascending: false })

  const pendentes = (teachers ?? []).filter((t) => t.status === 'pending').length

  return (
    <>
      <PageHeader
        olho="Administração"
        titulo="Professores"
        descricao={
          pendentes > 0
            ? `${teachers?.length ?? 0} cadastrados · ${pendentes} aguardando aprovação`
            : `${teachers?.length ?? 0} ${teachers?.length === 1 ? 'professor cadastrado' : 'professores cadastrados'}`
        }
      />

      <PageBody>
        {!teachers || teachers.length === 0 ? (
          <EmptyState
            icon={Users}
            titulo="Nenhum professor cadastrado"
            descricao="Quem se cadastra como chef aparece aqui pra você aprovar antes de publicar cursos."
          />
        ) : (
          <Panel>
            <ul className="divide-y divide-cobalto/10">
              {teachers.map((teacher) => {
                const profile = teacher.profile as any
                return (
                  <li key={teacher.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                    <Ladrilho tom="cobalto" tamanho="md">
                      <span className="font-display text-xs font-extrabold">
                        {profile?.name?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    </Ladrilho>
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="truncate font-medium text-tinta">{profile?.name ?? 'Sem nome'}</p>
                      <p className="mt-0.5 text-xs text-tinta-suave/70">
                        Comissão <strong className="font-semibold text-tinta-suave">{teacher.commission_rate}%</strong>
                        {teacher.stripe_account_id ? ' · Stripe conectado' : ' · Stripe pendente'}
                      </p>
                    </div>
                    <StatusBadge tipo="professor" status={teacher.status} className="shrink-0" />
                    <TeacherActions
                      teacherProfileId={teacher.id}
                      userId={teacher.user_id}
                      currentStatus={teacher.status}
                      currentCommission={teacher.commission_rate}
                      podeEditarComissao={podeEditarComissao}
                    />
                  </li>
                )
              })}
            </ul>
          </Panel>
        )}
      </PageBody>
    </>
  )
}
