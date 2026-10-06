import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { apagarVideoNoBunny } from '@/lib/bunny'

/**
 * Tira um vídeo da aula: serve tanto para "cancelar o envio que está
 * acontecendo" quanto para "remover o vídeo".
 *
 * Três situações, na ordem em que são checadas:
 *   1. o vídeo é o da troca pendente de aprovação → desiste do pedido;
 *   2. é o vídeo da aula e o curso NÃO tem aluno → remove livremente;
 *   3. é o vídeo da aula e o curso TEM aluno → só se ele nunca chegou a ser
 *      assistível (`uploading`/`failed`). Um vídeo que o aluno já pode ver não
 *      sai sem o admin (decisão 3.4).
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lessonId, videoId } = await req.json().catch(() => ({}))
  if (!lessonId || !videoId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, course_id, bunny_video_id, video_status, courses!inner(teacher_id)')
    .eq('id', lessonId)
    .maybeSingle()

  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  if ((lesson as any).courses.teacher_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 1. Troca pendente
  const { data: pedido } = await supabase
    .from('lesson_change_requests')
    .select('id')
    .eq('lesson_id', lessonId)
    .eq('status', 'pending')
    .eq('type', 'replace_video')
    .eq('new_bunny_video_id', videoId)
    .maybeSingle()

  if (pedido) {
    await supabase.from('lesson_change_requests').delete().eq('id', pedido.id)
    await apagarVideoNoBunny(videoId)
    return NextResponse.json({ ok: true, tipo: 'pedido' })
  }

  if (lesson.bunny_video_id !== videoId) {
    return NextResponse.json({ error: 'Vídeo não pertence a esta aula.' }, { status: 404 })
  }

  const { data: temAluno } = await supabase.rpc('curso_tem_aluno', { p_course_id: lesson.course_id })
  const jaAssistivel = lesson.video_status === 'ready' || lesson.video_status === 'processing'

  if (temAluno === true && jaAssistivel) {
    return NextResponse.json(
      { error: 'Este curso já tem alunos. Envie um vídeo novo — a troca passa pelo admin.' },
      { status: 403 }
    )
  }

  // Service role: o trigger lessons_guard_change barraria o professor de zerar
  // o vídeo num curso vendido, e aqui já decidimos que pode (nunca foi assistível).
  const { error } = await createAdminClient()
    .from('lessons')
    .update({
      bunny_video_id: null,
      bunny_video_url: null,
      duration_seconds: null,
      video_status: 'none',
    })
    .eq('id', lessonId)

  if (error) {
    console.error('[bunny/video] falha ao limpar aula:', error)
    return NextResponse.json({ error: 'Não foi possível remover o vídeo.' }, { status: 500 })
  }

  await apagarVideoNoBunny(videoId)
  return NextResponse.json({ ok: true, tipo: 'aula' })
}
