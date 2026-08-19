import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser, isOwner } from '@/lib/auth/session'
import { TeacherActions } from '@/components/admin/TeacherActions'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel } from '@/components/ui/panel'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { Ladrilho } from '@/components/ui/ladrilho'
import { Users, ExternalLink } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Professores' }

/** CPF/CNPJ sai do banco só com dígitos — aqui ganha a máscara de leitura. */
function formatarDocumento(doc: string | null) {
  if (!doc) return null
  if (doc.length === 11) return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (doc.length === 14) return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return doc
}

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
                const documento = formatarDocumento(teacher.document)

                return (
                  <li key={teacher.id} className="p-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
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
                        currentStatus={teacher.status}
                        currentCommission={teacher.commission_rate}
                        podeEditarComissao={podeEditarComissao}
                        candidaturaEnviada={!!teacher.submitted_at && !!teacher.document}
                      />
                    </div>

                    {/* Decisão 4.2: o botão "Ativar" era a tela inteira. Agora o
                        que o admin precisa ler pra decidir fica junto dele. */}
                    {teacher.submitted_at ? (
                      <div className="mt-3 rounded-sm border border-cobalto/15 bg-cal-fundo p-3.5 text-sm">
                        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-tinta-suave/60">
                              {teacher.document?.length === 14 ? 'CNPJ' : 'CPF'}
                            </dt>
                            <dd className="tabular-nums text-tinta">{documento ?? '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-tinta-suave/60">Telefone</dt>
                            <dd className="tabular-nums text-tinta">{teacher.phone ?? '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-tinta-suave/60">Portfólio</dt>
                            <dd>
                              {teacher.portfolio_url ? (
                                <a
                                  href={teacher.portfolio_url}
                                  target="_blank"
                                  rel="noopener noreferrer nofollow"
                                  className="inline-flex items-center gap-1 text-cobalto underline-offset-4 hover:underline"
                                >
                                  <span className="max-w-[22ch] truncate">{teacher.portfolio_url}</span>
                                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                                </a>
                              ) : (
                                <span className="text-tinta-suave">Não enviou</span>
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-tinta-suave/60">Enviada em</dt>
                            <dd className="text-tinta">
                              {new Date(teacher.submitted_at).toLocaleDateString('pt-BR')}
                              {teacher.exclusivity_accepted_at && ' · exclusividade aceita'}
                            </dd>
                          </div>
                        </dl>

                        {teacher.experience && (
                          <p className="mt-3 whitespace-pre-line border-t border-cobalto/10 pt-3 leading-relaxed text-tinta-suave">
                            {teacher.experience}
                          </p>
                        )}

                        {teacher.status === 'rejected' && teacher.rejection_reason && (
                          <p className="mt-3 border-t border-cobalto/10 pt-3 text-xs text-red-700">
                            Recusado: {teacher.rejection_reason}
                          </p>
                        )}
                      </div>
                    ) : (
                      teacher.status === 'pending' && (
                        <p className="mt-3 text-xs text-tinta-suave">
                          Ainda não enviou a candidatura — sem documento e contato não dá pra aprovar.
                        </p>
                      )
                    )}
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
