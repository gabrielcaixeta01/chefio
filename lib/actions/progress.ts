'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser } from '@/lib/auth/session'

/**
 * Marca uma aula como concluída.
 *
 * Por que Server Action e não um upsert do client, como era antes:
 *
 * O painel (/aluno), a biblioteca (/aluno/cursos) e a página do curso são
 * Server Components — o progresso é calculado no servidor. Quando a escrita
 * acontece direto do navegador pro Supabase, o Next não fica sabendo de nada,
 * e o Router Cache do client continua servindo o payload que ele guardou da
 * última vez que o aluno passou por /aluno. Resultado: o aluno assistia três
 * aulas, clicava em "Minha área" e via "não iniciado" — só o F5, que ignora
 * esse cache, mostrava a verdade.
 *
 * `revalidatePath('/aluno', 'layout')` derruba o cache de tudo que pendura
 * embaixo desse layout de uma vez, independente de por onde o aluno saia da
 * aula: link do menu, botão do navegador ou migalha de pão.
 *
 * De brinde, o student_id passa a vir da sessão em vez de uma prop que o
 * client mandava. A RLS já barrava gravar no nome de outro aluno, mas o id de
 * quem escreve não é assunto do navegador.
 */
export async function marcarAulaConcluida(lessonId: string) {
  const user = await getAuthedUser()
  if (!user) return { erro: 'Sessão expirada. Entre de novo para salvar seu progresso.' }

  const supabase = await createClient()
  const { error } = await supabase.from('lesson_progress').upsert(
    {
      student_id: user.id,
      lesson_id: lessonId,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'student_id,lesson_id' }
  )

  if (error) {
    console.error('[marcarAulaConcluida] falha ao salvar progresso:', error)
    return { erro: 'Não foi possível salvar seu progresso. Tente de novo.' }
  }

  revalidatePath('/aluno', 'layout')
  return { erro: null }
}
