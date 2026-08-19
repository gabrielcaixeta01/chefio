import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser, roleFromUser } from '@/lib/auth/session'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel } from '@/components/ui/panel'
import { Notice } from '@/components/ui/notice'
import { TeacherApplicationForm } from '@/components/aluno/TeacherApplicationForm'

export const metadata: Metadata = { title: 'Quero ensinar' }

/**
 * Candidatura a professor (decisão 4.2).
 *
 * Fica na área do aluno porque é lá que o candidato vive: `profiles.role` só
 * vira 'teacher' quando o admin aprova (trigger sync_role_with_teacher_status),
 * então quem está pendente não entra em /professor. E desde a decisão 4.3 essa
 * também é a porta do aluno que resolveu ensinar.
 */
export default async function CandidaturaPage() {
  const user = await getAuthedUser()
  if (!user) redirect('/login')

  // Já é professor: a página não tem função nenhuma pra ele.
  if (roleFromUser(user) === 'teacher') redirect('/professor')

  const supabase = await createClient()
  const { data: candidatura } = await supabase
    .from('teacher_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const enviada = !!candidatura?.submitted_at
  const recusada = candidatura?.status === 'rejected'
  const suspensa = candidatura?.status === 'suspended'

  return (
    <>
      <PageHeader
        olho="Chefio"
        titulo="Quero ensinar"
        descricao="Conta pra gente quem você é. Um admin analisa e responde."
      />

      <PageBody className="max-w-2xl">
        {suspensa && (
          <Notice tipo="erro" titulo="Sua conta de professor está suspensa" className="mb-6">
            Seus cursos saíram do catálogo, mas quem já comprou continua assistindo. Fale com o
            suporte para entender o que aconteceu.
          </Notice>
        )}

        {recusada && (
          <Notice tipo="atencao" titulo="Candidatura recusada" className="mb-6">
            {candidatura?.rejection_reason
              ? candidatura.rejection_reason
              : 'Não recebemos um motivo registrado. Você pode corrigir os dados e enviar de novo.'}
          </Notice>
        )}

        {enviada && !recusada && candidatura?.status === 'pending' && (
          <Notice tipo="info" titulo="Candidatura em análise" className="mb-6">
            Enviada em {new Date(candidatura.submitted_at!).toLocaleDateString('pt-BR')}. Você pode
            corrigir os dados abaixo enquanto ninguém decidiu.
          </Notice>
        )}

        {!enviada && candidatura && (
          <Notice tipo="atencao" titulo="Falta enviar seus dados" className="mb-6">
            Você se cadastrou como professor, mas o admin ainda não tem o que analisar. Preencha
            abaixo para entrar na fila.
          </Notice>
        )}

        {!suspensa && (
          <Panel className="p-6">
            <TeacherApplicationForm userId={user.id} candidatura={candidatura ?? null} />
          </Panel>
        )}

        <Notice tipo="info" className="mt-6">
          Você continua com acesso normal de aluno enquanto isso — e continua com ele depois de
          aprovado. É a mesma conta para comprar e para ensinar.
        </Notice>
      </PageBody>
    </>
  )
}
