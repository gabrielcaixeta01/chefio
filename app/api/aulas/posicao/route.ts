import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Guarda até onde o aluno assistiu, para "continuar de onde parou".
 *
 * Route handler e não Server Action de propósito: o player chama isto a cada
 * ~15s e ao fechar a aba (fetch com `keepalive`). Uma Server Action reexecuta o
 * ciclo de renderização do Next a cada chamada; aqui é só um upsert.
 *
 * O upsert grava SÓ `last_watched_seconds`. `completed_at` fica como está —
 * se entrasse `null` aqui, assistir de novo uma aula concluída a desconcluiria.
 * (O progresso do curso conta `completed_at`, não a existência da linha.)
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lessonId, seconds } = await req.json().catch(() => ({}))
  if (typeof lessonId !== 'string' || typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  }

  const { error } = await supabase.from('lesson_progress').upsert(
    {
      student_id: user.id,
      lesson_id: lessonId,
      last_watched_seconds: Math.max(0, Math.floor(seconds)),
    },
    { onConflict: 'student_id,lesson_id' }
  )

  if (error) {
    console.error('[aulas/posicao]', error)
    return NextResponse.json({ error: 'Falha ao salvar' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
