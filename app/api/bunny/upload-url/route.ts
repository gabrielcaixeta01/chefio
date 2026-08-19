import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lessonId, fileName } = await req.json()
  if (!lessonId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  // Verify teacher owns this lesson/course
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, course_id, bunny_video_id, courses!inner(teacher_id)')
    .eq('id', lessonId)
    .single()

  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

  const course = (lesson as any).courses
  if (course.teacher_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Trocar o vídeo de uma aula que já está no ar num curso vendido depende do
  // admin (decisão 3.4). O upload acontece do mesmo jeito — o vídeo novo fica
  // parado no Bunny e o antigo continua servindo o aluno até alguém decidir.
  // Primeiro upload da aula (sem vídeo ainda) não é troca, passa direto.
  let precisaAprovacao = false
  if (lesson.bunny_video_id) {
    const { data: temAluno } = await supabase.rpc('curso_tem_aluno', {
      p_course_id: lesson.course_id,
    })
    precisaAprovacao = temAluno === true
  }

  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID
  const apiKey = process.env.BUNNY_STREAM_API_KEY

  if (!libraryId || !apiKey) {
    return NextResponse.json({ error: 'Bunny.net não configurado' }, { status: 503 })
  }

  // Create video object in Bunny.net
  const title = fileName?.replace(/\.[^.]+$/, '') || `lesson-${lessonId}`
  const createRes = await fetch(
    `https://video.bunnycdn.com/library/${libraryId}/videos`,
    {
      method: 'POST',
      headers: {
        AccessKey: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    }
  )

  if (!createRes.ok) {
    const text = await createRes.text()
    return NextResponse.json({ error: `Bunny error: ${text}` }, { status: 502 })
  }

  const { guid: videoId } = await createRes.json()

  if (precisaAprovacao) {
    // Reenviar um vídeo por cima substitui o pedido anterior — só existe um
    // pendente por aula (índice parcial na 00017).
    await supabase
      .from('lesson_change_requests')
      .delete()
      .eq('lesson_id', lessonId)
      .eq('status', 'pending')
      .eq('type', 'replace_video')

    const { error: pedidoErro } = await supabase.from('lesson_change_requests').insert({
      lesson_id: lessonId,
      lesson_title: lesson.title,
      course_id: lesson.course_id,
      teacher_id: user.id,
      type: 'replace_video',
      new_bunny_video_id: videoId,
    })

    if (pedidoErro) {
      return NextResponse.json(
        { error: 'Já existe uma alteração em análise para esta aula.' },
        { status: 409 }
      )
    }
  } else {
    // Save videoId to lesson immediately
    await supabase
      .from('lessons')
      .update({ bunny_video_id: videoId })
      .eq('id', lessonId)
  }

  // Credenciais de upload TUS: a apiKey nunca sai do servidor, só a
  // assinatura. Formato exigido pelo Bunny Stream: sha256(libraryId + apiKey
  // + expirationTime + videoId), hex, expiração em segundos (unix), até 24h.
  const expiration = Math.floor(Date.now() / 1000) + 3600
  const signature = createHash('sha256')
    .update(`${libraryId}${apiKey}${expiration}${videoId}`)
    .digest('hex')

  return NextResponse.json({
    tusEndpoint: 'https://video.bunnycdn.com/tusupload',
    libraryId,
    videoId,
    signature,
    expiration,
    aguardandoAprovacao: precisaAprovacao,
  })
}
