import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buscarVideoNoBunny, sincronizarVideoDaAula } from '@/lib/bunny'

/**
 * Situação do vídeo para o painel do professor (o uploader consulta isto em
 * intervalo enquanto o Bunny codifica).
 *
 * `videoId` é opcional: sem ele vale o vídeo no ar da aula; com ele pode ser o
 * da troca que espera aprovação do admin — esse não está em `lessons`, então
 * só lemos o Bunny, sem gravar nada.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const lessonId = req.nextUrl.searchParams.get('lessonId')
  const videoIdPedido = req.nextUrl.searchParams.get('videoId')
  if (!lessonId) return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 })

  const { data: lesson, error: lessonErro } = await supabase
    .from('lessons')
    .select('id, bunny_video_id, courses!inner(teacher_id)')
    .eq('id', lessonId)
    .maybeSingle()

  if (lessonErro) {
    console.error('[bunny/status] aula não lida:', lessonErro)
    return NextResponse.json({ error: 'Não foi possível consultar a aula.' }, { status: 500 })
  }
  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  if ((lesson as any).courses.teacher_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const videoId = videoIdPedido ?? lesson.bunny_video_id
  if (!videoId) return NextResponse.json({ status: 'none', progresso: 0, duracao: null })

  if (videoId === lesson.bunny_video_id) {
    const r = await sincronizarVideoDaAula(lessonId, videoId)
    if (!r) return NextResponse.json({ error: 'Não foi possível consultar o vídeo agora.' }, { status: 502 })
    return NextResponse.json(r)
  }

  // Só o vídeo pendente DESTA aula, que o professor mesmo enviou — senão a
  // rota viraria uma consulta livre ao Bunny por guid.
  const { data: pedido, error: pedidoErro } = await supabase
    .from('lesson_change_requests')
    .select('id')
    .eq('lesson_id', lessonId)
    .eq('status', 'pending')
    .eq('new_bunny_video_id', videoId)
    .maybeSingle()
  if (pedidoErro) {
    console.error('[bunny/status] pedido não lido:', pedidoErro)
    return NextResponse.json({ error: 'Não foi possível consultar a aula.' }, { status: 500 })
  }
  if (!pedido) return NextResponse.json({ error: 'Vídeo não pertence a esta aula.' }, { status: 404 })

  const noBunny = await buscarVideoNoBunny(videoId)
  if (noBunny === null) {
    return NextResponse.json({ error: 'Não foi possível consultar o vídeo agora.' }, { status: 502 })
  }
  if (noBunny === 'inexistente') {
    return NextResponse.json({ status: 'failed', progresso: 0, duracao: null })
  }
  return NextResponse.json(noBunny)
}
