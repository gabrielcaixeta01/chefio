import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getAuthedUser, roleFromUser } from '@/lib/auth/session'

/**
 * Metadados do vídeo novo direto no Bunny.
 *
 * O webhook de encoding do Bunny casa por `bunny_video_id` na tabela `lessons`
 * — e enquanto a troca está pendente o vídeo novo não está em lesson nenhuma,
 * então aquele webhook passou batido. Quem preenche url e duração é isto aqui,
 * na hora da aprovação.
 */
async function metadadosDoVideo(videoId: string) {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID
  const apiKey = process.env.BUNNY_STREAM_API_KEY
  const cdnHostname = process.env.BUNNY_STREAM_CDN_HOSTNAME

  const url = cdnHostname ? `https://${cdnHostname}/${libraryId}/${videoId}/play` : null
  if (!libraryId || !apiKey) return { url, duracao: null as number | null }

  try {
    const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
      headers: { AccessKey: apiKey },
    })
    if (!res.ok) return { url, duracao: null }
    const video = await res.json()
    return { url, duracao: typeof video?.length === 'number' ? video.length : null }
  } catch {
    return { url, duracao: null }
  }
}

/**
 * Decisão do admin sobre uma mudança em aula de curso já vendido (decisão 3.4).
 *
 * Roda com service role de propósito: o trigger `lessons_guard_change` recusa
 * a remoção e a troca de vídeo quando existe `auth.uid()`, e é justamente por
 * esta porta que a mudança aprovada entra.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthedUser()
  const role = roleFromUser(user)
  if (role !== 'admin' && role !== 'owner') {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 403 })
  }

  const { requestId, decisao, nota } = await req.json().catch(() => ({}))
  if (!requestId || (decisao !== 'aprovar' && decisao !== 'recusar')) {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: pedido } = await admin
    .from('lesson_change_requests')
    .select('id, lesson_id, type, new_bunny_video_id, status')
    .eq('id', requestId)
    .maybeSingle()

  if (!pedido) return NextResponse.json({ erro: 'Pedido não encontrado.' }, { status: 404 })
  if (pedido.status !== 'pending') {
    return NextResponse.json({ erro: 'Este pedido já foi resolvido.' }, { status: 409 })
  }

  if (decisao === 'aprovar' && pedido.lesson_id) {
    if (pedido.type === 'remove') {
      const { error } = await admin.from('lessons').delete().eq('id', pedido.lesson_id)
      if (error) {
        console.error('remoção de aula:', error)
        return NextResponse.json({ erro: 'Não foi possível remover a aula.' }, { status: 500 })
      }
    } else if (pedido.new_bunny_video_id) {
      const { url, duracao } = await metadadosDoVideo(pedido.new_bunny_video_id)
      const { error } = await admin
        .from('lessons')
        .update({
          bunny_video_id: pedido.new_bunny_video_id,
          bunny_video_url: url,
          duration_seconds: duracao,
        })
        .eq('id', pedido.lesson_id)
      if (error) {
        console.error('troca de vídeo:', error)
        return NextResponse.json({ erro: 'Não foi possível trocar o vídeo.' }, { status: 500 })
      }
    }
  }

  // Depois do delete acima o `lesson_id` do pedido vira null (on delete set
  // null) — o pedido continua no histórico com o título guardado.
  await admin
    .from('lesson_change_requests')
    .update({
      status: decisao === 'aprovar' ? 'approved' : 'rejected',
      review_note: nota ?? null,
      reviewed_by: user!.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  return NextResponse.json({ status: decisao === 'aprovar' ? 'approved' : 'rejected' })
}
