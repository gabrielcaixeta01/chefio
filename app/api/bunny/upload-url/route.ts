import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'
import {
  BUNNY_API,
  VIDEO_TAMANHO_MAX,
  apagarVideoNoBunny,
  bunnyConfig,
  extensaoValida,
} from '@/lib/bunny'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lessonId, fileName, fileSize } = await req.json().catch(() => ({}))
  if (!lessonId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  // O navegador já filtra, mas é aqui que vale: quem chama a rota direto não
  // passa pelo componente. O tamanho é o que o cliente declara — o Bunny é
  // quem corta de verdade se o arquivo real passar do declarado.
  if (fileName && !extensaoValida(String(fileName))) {
    return NextResponse.json(
      { error: 'Formato não suportado. Envie MP4, MOV, M4V, WebM, MKV ou AVI.' },
      { status: 400 }
    )
  }
  if (typeof fileSize === 'number' && fileSize > VIDEO_TAMANHO_MAX) {
    return NextResponse.json({ error: 'O vídeo passa do limite de 5 GB.' }, { status: 413 })
  }
  if (typeof fileSize === 'number' && fileSize <= 0) {
    return NextResponse.json({ error: 'O arquivo está vazio.' }, { status: 400 })
  }

  // Verify teacher owns this lesson/course
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, course_id, bunny_video_id, video_status, courses!inner(teacher_id)')
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
  //
  // Só conta como "troca" se o vídeo atual é assistível. Um que falhou ou nunca
  // terminou de subir não está no ar para ninguém, então trocá-lo é consertar,
  // não alterar o que o aluno comprou — passa direto.
  let temAluno = false
  let precisaAprovacao = false
  if (lesson.bunny_video_id) {
    const { data, error: alunoErro } = await supabase.rpc('curso_tem_aluno', { p_course_id: lesson.course_id })
    // Falha fechada: tratar o erro como "sem aluno" deixaria o professor
    // trocar o vídeo de um curso vendido sem passar pelo admin.
    if (alunoErro) {
      console.error('[bunny/upload-url] curso_tem_aluno falhou:', alunoErro)
      return NextResponse.json({ error: 'Não foi possível verificar o curso. Tente novamente.' }, { status: 500 })
    }
    temAluno = data === true
    precisaAprovacao =
      temAluno && (lesson.video_status === 'ready' || lesson.video_status === 'processing')
  }

  const cfg = bunnyConfig()
  if (!cfg) {
    return NextResponse.json({ error: 'Bunny.net não configurado' }, { status: 503 })
  }
  const { libraryId, apiKey } = cfg

  // Create video object in Bunny.net
  const title = fileName?.replace(/\.[^.]+$/, '') || `lesson-${lessonId}`
  const createRes = await fetch(`${BUNNY_API}/library/${libraryId}/videos`, {
    method: 'POST',
    headers: {
      AccessKey: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  })

  if (!createRes.ok) {
    const text = await createRes.text()
    return NextResponse.json({ error: `Bunny error: ${text}` }, { status: 502 })
  }

  const { guid: videoId } = await createRes.json()

  if (precisaAprovacao) {
    // Reenviar um vídeo por cima substitui o pedido anterior — só existe um
    // pendente por aula (índice parcial na 00017).
    const { data: anterior, error: anteriorErro } = await supabase
      .from('lesson_change_requests')
      .select('new_bunny_video_id')
      .eq('lesson_id', lessonId)
      .eq('status', 'pending')
      .eq('type', 'replace_video')
      .maybeSingle()

    const { error: limparErro } = await supabase
      .from('lesson_change_requests')
      .delete()
      .eq('lesson_id', lessonId)
      .eq('status', 'pending')
      .eq('type', 'replace_video')

    if (anteriorErro || limparErro) {
      console.error('[bunny/upload-url] pedido anterior não tratado:', anteriorErro ?? limparErro)
      await apagarVideoNoBunny(videoId)
      return NextResponse.json({ error: 'Não foi possível preparar o envio.' }, { status: 500 })
    }

    const { error: pedidoErro } = await supabase.from('lesson_change_requests').insert({
      lesson_id: lessonId,
      lesson_title: lesson.title,
      course_id: lesson.course_id,
      teacher_id: user.id,
      type: 'replace_video',
      new_bunny_video_id: videoId,
    })

    if (pedidoErro) {
      await apagarVideoNoBunny(videoId)
      return NextResponse.json(
        { error: 'Já existe uma alteração em análise para esta aula.' },
        { status: 409 }
      )
    }

    if (anterior?.new_bunny_video_id) await apagarVideoNoBunny(anterior.new_bunny_video_id)
  } else {
    // O vídeo passa a ser este já: o status começa em `uploading` para o
    // aluno e o painel saberem que ainda não dá para assistir.
    // O trigger lessons_guard_change barra o professor de trocar o bunny_video_id
    // de um curso vendido; para o vídeo quebrado/incompleto a troca é legítima,
    // então ela entra por service role (a posse da aula já foi checada acima).
    const escritor = temAluno ? createAdminClient() : supabase
    const { error: updateErro } = await escritor
      .from('lessons')
      .update({
        bunny_video_id: videoId,
        bunny_video_url: null,
        duration_seconds: null,
        video_status: 'uploading',
      })
      .eq('id', lessonId)

    if (updateErro) {
      await apagarVideoNoBunny(videoId)
      return NextResponse.json({ error: 'Não foi possível preparar o envio.' }, { status: 500 })
    }

    // Troca num curso sem aluno: o vídeo antigo não serve mais a ninguém, e
    // deixar no Bunny seria pagar armazenamento por lixo.
    if (lesson.bunny_video_id) await apagarVideoNoBunny(lesson.bunny_video_id)
  }

  // Credenciais de upload TUS: a apiKey nunca sai do servidor, só a
  // assinatura. Formato exigido pelo Bunny Stream: sha256(libraryId + apiKey
  // + expirationTime + videoId), hex, expiração em segundos (unix), até 24h.
  // 12h cobre um arquivo grande numa conexão lenta com pausas pelo caminho.
  const expiration = Math.floor(Date.now() / 1000) + 12 * 3600
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
