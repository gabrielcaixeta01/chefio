import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * Exclusão de conta (decisões 9.3 e 9.4).
 *
 * Duas metades que só funcionam juntas: `anonymize_account` esvazia o que é
 * pessoal e mantém o histórico de compra sem dono identificável, e o Auth
 * apaga o usuário — que é onde moram e-mail e senha. A ordem importa: se o
 * usuário sumisse primeiro, a função rodaria sem ninguém pra anonimizar.
 *
 * Desde a 00022 `profiles` não referencia mais `auth.users`, então apagar o
 * usuário não leva junto matrícula, pedido e nota (9.4).
 */
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })

  const admin = createAdminClient()

  const { error: anonError } = await admin.rpc('anonymize_account', { p_user_id: user.id })
  if (anonError) {
    // As mensagens do raise já vêm prontas ("Você tem um pedido de
    // reembolso em análise...").
    return NextResponse.json({ erro: anonError.message }, { status: 400 })
  }

  // Foto de perfil: o bucket é público e o arquivo sobreviveria à conta.
  const { data: arquivos } = await admin.storage.from('avatars').list(user.id)
  if (arquivos && arquivos.length > 0) {
    await admin.storage.from('avatars').remove(arquivos.map((a) => `${user.id}/${a.name}`))
  }

  const { error: authError } = await admin.auth.admin.deleteUser(user.id)
  if (authError) {
    // O cadastro já foi anonimizado neste ponto — a conta está inutilizável,
    // mas o usuário do Auth ficou. Sem o log não sobra rastro disso.
    console.error('deleteUser error:', authError, 'user:', user.id)
    return NextResponse.json(
      { erro: 'Seus dados foram apagados, mas o login não pôde ser encerrado. Fale com a equipe.' },
      { status: 500 }
    )
  }

  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
