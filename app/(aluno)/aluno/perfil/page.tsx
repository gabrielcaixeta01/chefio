import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, roleFromUser } from '@/lib/auth/session'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { ProfileForm } from '@/components/aluno/ProfileForm'
import { DeleteAccountPanel } from '@/components/aluno/DeleteAccountPanel'

export const metadata: Metadata = { title: 'Minha conta' }

/**
 * Decisão 7.4. Não existia tela de perfil nenhuma: nem nome, nem e-mail, nem
 * foto. É também onde mora o descadastro de marketing da 7.5 — a lei pede
 * que sair seja tão fácil quanto entrar, e um link escondido no rodapé de um
 * e-mail não é isso.
 */
export default async function PerfilPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, avatar_url, marketing_opt_in')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <>
      <PageHeader
        olho="Conta"
        titulo="Minha conta"
        descricao="Seus dados de acesso e como a Chefio fala com você."
      />

      <PageBody className="max-w-2xl">
        <ProfileForm
          userId={user.id}
          email={user.email ?? ''}
          nome={profile?.name ?? ''}
          avatarUrl={profile?.avatar_url ?? null}
          marketingOptIn={profile?.marketing_opt_in ?? true}
        />

        {/* Decisão 9.3: fica no fim da própria tela de perfil — sair tem que
            ser tão fácil de achar quanto entrar. */}
        <div className="mt-10">
          <DeleteAccountPanel ehProfessor={roleFromUser(user) === 'teacher'} />
        </div>
      </PageBody>
    </>
  )
}
