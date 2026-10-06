import { createAdminClient } from '@/lib/supabase/server'
import type { VideoStatus } from '@/types/database'

export { VIDEO_TAMANHO_MAX, VIDEO_EXTENSOES, extensaoValida } from '@/lib/video-upload'

/**
 * Tudo que o servidor precisa saber do Bunny Stream num lugar só: a rota de
 * upload, a de status, o webhook e o player liam e interpretavam o status do
 * Bunny cada um do seu jeito (só o webhook sabia que 4 = pronto).
 */

export const BUNNY_API = 'https://video.bunnycdn.com'

export function bunnyConfig() {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID
  const apiKey = process.env.BUNNY_STREAM_API_KEY
  if (!libraryId || !apiKey) return null
  return { libraryId, apiKey }
}

export type VideoNoBunny = {
  status: VideoStatus
  /** 0–100, só faz sentido enquanto `processing`. */
  progresso: number
  duracao: number | null
}

/**
 * Códigos do Bunny: 0 criado · 1 enviado · 2 processando · 3 transcodificando
 * · 4 finalizado · 5 erro · 6 envio falhou · 7+ jobs de legenda/IA.
 *
 * O 3 já toca (a primeira resolução fica pronta antes das outras), então
 * esperar o 4 deixava o professor olhando "processando" para um vídeo que já
 * dava para assistir.
 */
export function interpretarVideo(v: {
  status?: number
  encodeProgress?: number
  length?: number
  availableResolutions?: string | null
}): VideoNoBunny {
  const codigo = v.status ?? 0
  const duracao = typeof v.length === 'number' && v.length > 0 ? Math.round(v.length) : null
  const progresso = Math.max(0, Math.min(100, Math.round(v.encodeProgress ?? 0)))

  if (codigo === 5 || codigo === 6) return { status: 'failed', progresso, duracao }
  if (codigo === 0) return { status: 'uploading', progresso: 0, duracao }
  if (codigo === 4 || codigo >= 7) return { status: 'ready', progresso: 100, duracao }
  if (codigo === 3 && v.availableResolutions) return { status: 'ready', progresso: 100, duracao }
  return { status: 'processing', progresso, duracao }
}

/** `null` = Bunny sem configuração ou fora do ar; `'inexistente'` = 404. */
export async function buscarVideoNoBunny(videoId: string): Promise<VideoNoBunny | 'inexistente' | null> {
  const cfg = bunnyConfig()
  if (!cfg) return null

  try {
    const res = await fetch(`${BUNNY_API}/library/${cfg.libraryId}/videos/${videoId}`, {
      headers: { AccessKey: cfg.apiKey },
      cache: 'no-store',
    })
    if (res.status === 404) return 'inexistente'
    if (!res.ok) return null
    return interpretarVideo(await res.json())
  } catch {
    return null
  }
}

/** Melhor esforço: vídeo órfão no Bunny custa armazenamento, mas não é erro do usuário. */
export async function apagarVideoNoBunny(videoId: string): Promise<void> {
  const cfg = bunnyConfig()
  if (!cfg) return
  try {
    await fetch(`${BUNNY_API}/library/${cfg.libraryId}/videos/${videoId}`, {
      method: 'DELETE',
      headers: { AccessKey: cfg.apiKey },
    })
  } catch (e) {
    console.error('[bunny] falha ao apagar vídeo', videoId, e)
  }
}

export function urlDoVideo(videoId: string): string | null {
  const cdn = process.env.BUNNY_STREAM_CDN_HOSTNAME
  const lib = process.env.BUNNY_STREAM_LIBRARY_ID
  return cdn && lib ? `https://${cdn}/${lib}/${videoId}/play` : null
}

/**
 * Pergunta ao Bunny e grava o resultado na aula, se mudou.
 *
 * Existe porque o webhook é a via feliz, não a única: ele pode não estar
 * configurado (como em homologação), chegar antes da linha ser atualizada ou
 * nunca chegar. Quem olha a aula — o painel do professor, o player do aluno —
 * acerta o status sozinho em vez de depender dele.
 *
 * Usa service role porque o aluno que dispara a consulta não tem permissão de
 * escrever em `lessons`. O trigger `lessons_guard_change` deixa passar quem não
 * tem auth.uid().
 */
export async function sincronizarVideoDaAula(
  lessonId: string,
  videoId: string
): Promise<VideoNoBunny | null> {
  const noBunny = await buscarVideoNoBunny(videoId)
  if (noBunny === null) return null

  const resultado: VideoNoBunny =
    noBunny === 'inexistente' ? { status: 'failed', progresso: 0, duracao: null } : noBunny

  const patch: { video_status: VideoStatus; duration_seconds?: number; bunny_video_url?: string | null } = {
    video_status: resultado.status,
  }
  if (resultado.status === 'ready') {
    if (resultado.duracao) patch.duration_seconds = resultado.duracao
    patch.bunny_video_url = urlDoVideo(videoId)
  }

  // `.eq('bunny_video_id', videoId)`: se a aula já trocou de vídeo no meio da
  // consulta, não sobrescrevemos o status do vídeo novo com o do antigo.
  await createAdminClient()
    .from('lessons')
    .update(patch)
    .eq('id', lessonId)
    .eq('bunny_video_id', videoId)

  return resultado
}
