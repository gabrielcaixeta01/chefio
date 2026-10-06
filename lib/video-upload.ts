/**
 * Regras de envio de vídeo que o navegador e o servidor precisam concordar.
 * Num arquivo à parte (sem imports de servidor) para o componente de upload
 * poder usar sem arrastar `next/headers` para o bundle do client.
 */

/** Limite do envio. TUS é resumível, então o teto é de bom senso, não técnico. */
export const VIDEO_TAMANHO_MAX = 5 * 1024 ** 3 // 5 GB

export const VIDEO_EXTENSOES = ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi'] as const

export function extensaoValida(nomeDoArquivo: string): boolean {
  const ext = nomeDoArquivo.split('.').pop()?.toLowerCase() ?? ''
  return (VIDEO_EXTENSOES as readonly string[]).includes(ext)
}
