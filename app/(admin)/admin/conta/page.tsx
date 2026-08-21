import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser, isOwner, roleFromUser } from '@/lib/auth/session'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel, SectionHeading } from '@/components/ui/panel'
import { ProfileForm } from '@/components/aluno/ProfileForm'
import { ShieldCheck } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Minha conta' }

/**
 * A conta do staff não tinha tela própria. Para trocar o nome, a foto ou o
 * e-mail, quem administra precisava atravessar para /aluno/perfil — e chegava
 * lá com a barra do aluno, o título "Área de aluno" e uma lista de páginas
 * que não são dele. Editar o próprio cadastro não devia custar uma troca de
 * contexto; o formulário é o mesmo, só passa a morar de deste lado também.
 *
 * O que NÃO vem junto é o DeleteAccountPanel da 9.3. Não por esquecimento:
 * apagar a conta com papel de admin/owner deixaria a plataforma sem ninguém
 * capaz de aprovar professor, curso ou reembolso — e é exatamente o estado
 * em que este projeto passou meses travado. Encerramento de conta de staff é
 * decisão de quem opera a plataforma, direto no banco, não um botão a um
 * clique de distância de uma sessão aberta.
 */
export default async function AdminContaPage() {
  // O layout de (admin) já rodou requireRole('admin'), e getAuthedUser é
  // cache()-deduped — aqui não custa uma segunda ida ao Auth server.
  const user = await getAuthedUser()
  if (!user) return null

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, avatar_url, marketing_opt_in')
    .eq('id', user.id)
    .maybeSingle()

  const dono = isOwner(user)

  return (
    <>
      <PageHeader
        olho="Administração"
        titulo="Minha conta"
        descricao="Seus dados de acesso e o papel que eles carregam na plataforma."
      />

      <PageBody className="max-w-2xl">
        <Panel className="mb-6 p-5 sm:p-6">
          <SectionHeading titulo="Papel nesta plataforma" />
          <div className="mt-4 flex items-start gap-4">
            <span
              aria-hidden="true"
              className="azulejo-escuro flex h-11 w-11 shrink-0 items-center justify-center rounded-sm [--azulejo-tamanho:44px]"
            >
              <ShieldCheck className="h-5 w-5 text-brasa" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg font-bold tracking-tight text-tinta">
                {dono ? 'Dono / financeiro' : 'Administração'}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-tinta-suave">
                {dono
                  ? 'Você aprova professores, cursos, reembolsos e devoluções — e é o único papel que altera a comissão cobrada de cada chef. Toda alteração de comissão fica registrada com seu nome.'
                  : 'Você aprova professores, cursos, reembolsos e devoluções. A comissão de cada chef só pode ser alterada pelo dono.'}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-tinta-suave/70">
                Papel não se troca por aqui: ele vive no banco e é sincronizado com a sessão a
                cada login.
              </p>
            </div>
          </div>
        </Panel>

        <ProfileForm
          userId={user.id}
          email={user.email ?? ''}
          nome={profile?.name ?? ''}
          avatarUrl={profile?.avatar_url ?? null}
          marketingOptIn={profile?.marketing_opt_in ?? true}
        />

        <p className="mt-10 text-sm leading-relaxed text-tinta-suave/70">
          Para encerrar uma conta de {roleFromUser(user) === 'owner' ? 'dono' : 'administração'},
          fale com quem opera a plataforma. A exclusão não fica aqui de propósito: uma conta de
          staff apagada por engano deixa professores, cursos e reembolsos sem ninguém para
          aprovar.
        </p>
      </PageBody>
    </>
  )
}
