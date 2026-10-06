import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getAuthedUser, roleFromUser } from '@/lib/auth/session'
import { buscarVideoNoBunny, urlDoVideo } from '@/lib/bunny'

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
  const { data: pedido, error: pedidoError } = await admin
    .from('lesson_change_requests')
    .select('id, lesson_id, type, new_bunny_video_id, status')
    .eq('id', requestId)
    .maybeSingle()

  if (pedidoError) {
    console.error('Alteração de aula: pedido não lido:', pedidoError)
    return NextResponse.json({ erro: 'Erro ao buscar o pedido.' }, { status: 500 })
  }
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
      // O webhook do Bunny casa por `bunny_video_id` na tabela `lessons` — e
      // enquanto a troca está pendente o vídeo novo não está em lesson nenhuma,
      // então ele passou batido. Status, url e duração saem do Bunny agora.
      // Se a consulta falhar, cai em `processing`: o player e o painel
      // reconsultam sozinhos e acertam.
      const noBunny = await buscarVideoNoBunny(pedido.new_bunny_video_id)
      const video = noBunny && noBunny !== 'inexistente' ? noBunny : null
      const { error } = await admin
        .from('lessons')
        .update({
          bunny_video_id: pedido.new_bunny_video_id,
          bunny_video_url: video?.status === 'ready' ? urlDoVideo(pedido.new_bunny_video_id) : null,
          duration_seconds: video?.duracao ?? null,
          video_status: noBunny === 'inexistente' ? 'failed' : (video?.status ?? 'processing'),
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
  const { error: decisaoError } = await admin
    .from('lesson_change_requests')
    .update({
      status: decisao === 'aprovar' ? 'approved' : 'rejected',
      review_note: nota ?? null,
      reviewed_by: user!.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (decisaoError) {
    // Em aprovação a mudança já foi aplicada à aula; sem o log o pedido fica
    // pendente na fila sem ninguém saber por quê.
    console.error('Alteração de aula: decisão não gravada:', decisaoError, 'pedido:', requestId)
    return NextResponse.json({ erro: 'Não foi possível registrar a decisão.' }, { status: 500 })
  }

  return NextResponse.json({ status: decisao === 'aprovar' ? 'approved' : 'rejected' })
}
