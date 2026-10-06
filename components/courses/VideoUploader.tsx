'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Upload as TusUpload } from 'tus-js-client'
import {
  AlertTriangle,
  CheckCircle,
  Clapperboard,
  Clock,
  Film,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { VideoPlayer } from '@/components/player/VideoPlayer'
import { cn, formatDuration } from '@/lib/utils'
import { VIDEO_EXTENSOES, VIDEO_TAMANHO_MAX, extensaoValida } from '@/lib/video-upload'
import type { Lesson, VideoStatus } from '@/types/database'

type Video = { status: VideoStatus; progresso: number; duracao: number | null }
type Pendente = { videoId: string; status: VideoStatus; progresso: number }
type Envio = {
  fase: 'enviando' | 'pausado' | 'erro'
  nome: string
  tamanho: number
  enviado: number
  /** bytes/s, média móvel. */
  velocidade: number
  avisos: string[]
}

interface VideoUploaderProps {
  lessonId: string
  initialStatus?: VideoStatus
  initialDuration?: number | null
  /** `bunny_video_id` da aula — necessário para remover/cancelar o vídeo certo. */
  initialVideoId?: string | null
  /**
   * Curso com aluno: o vídeo novo não entra no ar sozinho (decisão 3.4) e o
   * que já está no ar não pode ser removido. A tela avisa antes, em vez de a
   * pessoa descobrir pela recusa.
   */
  temAlunos?: boolean
  /** Vídeo novo já enviado, esperando o admin (lesson_change_requests). */
  pedidoVideoId?: string | null
  /** Avisa o pai para a lista de aulas refletir status/duração sem recarregar. */
  /** Troca pendente criada (id do vídeo novo) ou desfeita (null). */
  onPedidoChange?: (videoId: string | null) => void
  onChange?: (patch: Partial<Pick<Lesson, 'bunny_video_id' | 'video_status' | 'duration_seconds'>>) => void
}

const ACCEPT = [...VIDEO_EXTENSOES.map((e) => `.${e}`), 'video/*'].join(',')
const POLL_MS = 4000

function formatBytes(b: number) {
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(2)} GB`
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${Math.max(1, Math.round(b / 1024))} KB`
}

function formatEta(seg: number) {
  if (!Number.isFinite(seg) || seg <= 0) return ''
  if (seg < 60) return 'menos de 1 min'
  if (seg < 3600) return `${Math.ceil(seg / 60)} min`
  return `${Math.floor(seg / 3600)}h ${Math.ceil((seg % 3600) / 60)}min`
}

/**
 * Lê resolução e orientação antes de enviar. Serve só para AVISAR (vídeo na
 * vertical, resolução baixa): o que o navegador não decodifica (MKV, AVI)
 * devolve null e o envio segue normalmente — o Bunny converte.
 */
function lerMetadados(file: File): Promise<{ largura: number; altura: number } | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    const fim = (r: { largura: number; altura: number } | null) => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      resolve(r)
    }
    const timer = setTimeout(() => fim(null), 4000)
    video.preload = 'metadata'
    video.onloadedmetadata = () => fim({ largura: video.videoWidth, altura: video.videoHeight })
    video.onerror = () => fim(null)
    video.src = url
  })
}

export function VideoUploader({
  lessonId,
  initialStatus = 'none',
  initialDuration = null,
  initialVideoId = null,
  temAlunos = false,
  pedidoVideoId = null,
  onPedidoChange,
  onChange,
}: VideoUploaderProps) {
  const [atual, setAtual] = useState<Video>({ status: initialStatus, progresso: 0, duracao: initialDuration })
  const [pendente, setPendente] = useState<Pendente | null>(
    pedidoVideoId ? { videoId: pedidoVideoId, status: 'processing', progresso: 0 } : null
  )
  const [videoIdAtual, setVideoIdAtual] = useState<string | null>(initialVideoId)
  const [envio, setEnvio] = useState<Envio | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const [previa, setPrevia] = useState(false)
  const [removendo, setRemovendo] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const tusRef = useRef<TusUpload | null>(null)
  const videoIdEmEnvio = useRef<string | null>(null)
  const emReposicao = useRef(false) // o envio em andamento é troca aguardando aprovação
  const amostra = useRef({ t: 0, bytes: 0, vel: 0 })
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onPedidoRef = useRef(onPedidoChange)
  onPedidoRef.current = onPedidoChange

  const enviando = envio?.fase === 'enviando' || envio?.fase === 'pausado'

  // Fechar a aba com o envio no meio perde o que faltava (o TUS retoma, mas
  // só se a pessoa voltar e escolher o mesmo arquivo).
  useEffect(() => {
    if (!enviando) return
    const aviso = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [enviando])

  // Voltou a internet depois de o TUS esgotar as tentativas: segue sozinho.
  useEffect(() => {
    if (envio?.fase !== 'erro') return
    const voltou = () => retomar()
    window.addEventListener('online', voltou)
    return () => window.removeEventListener('online', voltou)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envio?.fase])

  // Sair da tela no meio do envio: interrompe sem apagar (a aba fechando já
  // avisou acima; navegar dentro do app é o caso aqui).
  useEffect(() => () => { void tusRef.current?.abort() }, [])

  // ── Acompanhamento do processamento ────────────────────────────────────
  // Vídeo da aula: enquanto `processing` consulta de 4 em 4s. `uploading` sem
  // envio ativo (aba recarregada) consulta UMA vez: o envio pode ter terminado
  // sem a tela ver, e se o Bunny ainda diz "criado" é envio abandonado.
  const consultar = useCallback(
    async (videoId?: string): Promise<Video | null> => {
      try {
        const qs = new URLSearchParams({ lessonId })
        if (videoId) qs.set('videoId', videoId)
        const res = await fetch(`/api/bunny/status?${qs}`, { cache: 'no-store' })
        if (!res.ok) return null
        return (await res.json()) as Video
      } catch {
        return null
      }
    },
    [lessonId]
  )

  useEffect(() => {
    const precisa =
      atual.status === 'processing' || (atual.status === 'uploading' && !enviando && !emReposicao.current)
    if (!precisa || enviando) return

    let cancelado = false
    let timer: ReturnType<typeof setTimeout>
    const continuar = atual.status === 'processing'

    async function ciclo() {
      const r = await consultar()
      if (cancelado) return
      if (r) {
        setAtual(r)
        if (r.status !== atual.status) {
          onChangeRef.current?.({ video_status: r.status, duration_seconds: r.duracao })
          if (r.status === 'ready') toast.success('Vídeo pronto para assistir!')
        }
        if (r.status !== 'processing') return
      }
      if (continuar) timer = setTimeout(ciclo, POLL_MS)
    }
    timer = setTimeout(ciclo, continuar ? POLL_MS : 0)
    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [atual.status, enviando, consultar])

  // Vídeo novo aguardando aprovação: só acompanha a codificação.
  useEffect(() => {
    if (!pendente || pendente.status !== 'processing' || enviando) return
    let cancelado = false
    let timer: ReturnType<typeof setTimeout>
    async function ciclo() {
      const r = await consultar(pendente!.videoId)
      if (cancelado) return
      if (r) {
        setPendente((p) => (p ? { ...p, status: r.status, progresso: r.progresso } : p))
        if (r.status !== 'processing') return
      }
      timer = setTimeout(ciclo, POLL_MS)
    }
    timer = setTimeout(ciclo, POLL_MS)
    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [pendente?.videoId, pendente?.status, enviando, consultar])

  // ── Envio ──────────────────────────────────────────────────────────────
  async function iniciar(file: File) {
    if (!extensaoValida(file.name) && !file.type.startsWith('video/')) {
      toast.error(`Formato não suportado. Envie ${VIDEO_EXTENSOES.map((e) => e.toUpperCase()).join(', ')}.`)
      return
    }
    if (file.size > VIDEO_TAMANHO_MAX) {
      toast.error(`O vídeo tem ${formatBytes(file.size)} e o limite é 5 GB. Reduza a qualidade na exportação.`)
      return
    }
    if (file.size === 0) {
      toast.error('O arquivo está vazio.')
      return
    }

    const avisos: string[] = []
    const meta = await lerMetadados(file)
    if (meta) {
      if (meta.altura > meta.largura) {
        avisos.push('Vídeo na vertical: na aula ele aparece com tarjas nas laterais. Gravar na horizontal rende mais.')
      } else if (meta.altura < 720) {
        avisos.push(`Resolução baixa (${meta.largura}×${meta.altura}). 720p ou mais fica nítido em tela cheia.`)
      }
    }

    setEnvio({ fase: 'enviando', nome: file.name, tamanho: file.size, enviado: 0, velocidade: 0, avisos })
    amostra.current = { t: Date.now(), bytes: 0, vel: 0 }

    try {
      // A AccessKey do Bunny nunca sai do servidor — só a assinatura TUS.
      const res = await fetch('/api/bunny/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, fileName: file.name, fileSize: file.size }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erro ao obter URL de upload')
      }
      const { tusEndpoint, libraryId, videoId, signature, expiration, aguardandoAprovacao } = await res.json()

      videoIdEmEnvio.current = videoId
      emReposicao.current = !!aguardandoAprovacao
      if (aguardandoAprovacao) {
        setPendente({ videoId, status: 'uploading', progresso: 0 })
        onPedidoRef.current?.(videoId)
      } else {
        setAtual({ status: 'uploading', progresso: 0, duracao: null })
        setVideoIdAtual(videoId)
        setPrevia(false)
        onChangeRef.current?.({ bunny_video_id: videoId, video_status: 'uploading', duration_seconds: null })
      }

      const upload = new TusUpload(file, {
        endpoint: tusEndpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000, 30000],
        // Pedaços de 8 MB: a barra anda de verdade e uma queda de rede custa
        // no máximo 8 MB de reenvio, não o arquivo inteiro.
        chunkSize: 8 * 1024 * 1024,
        // Cada envio tem seu próprio vídeo no Bunny; retomar por impressão
        // digital apontaria para um vídeo que já foi apagado.
        storeFingerprintForResuming: false,
        headers: {
          AuthorizationSignature: signature,
          AuthorizationExpire: String(expiration),
          VideoId: videoId,
          LibraryId: String(libraryId),
        },
        metadata: { filetype: file.type, title: file.name },
        onError: () => {
          setEnvio((e) => (e ? { ...e, fase: 'erro' } : e))
        },
        onProgress: (bytesEnviados) => {
          const agora = Date.now()
          const a = amostra.current
          const dt = (agora - a.t) / 1000
          if (dt >= 0.7) {
            const inst = (bytesEnviados - a.bytes) / dt
            a.vel = a.vel === 0 ? inst : a.vel * 0.7 + inst * 0.3
            a.t = agora
            a.bytes = bytesEnviados
          }
          setEnvio((e) => (e ? { ...e, fase: 'enviando', enviado: bytesEnviados, velocidade: a.vel } : e))
        },
        onSuccess: () => concluirEnvio(videoId, !!aguardandoAprovacao),
      })
      tusRef.current = upload
      upload.start()
    } catch (err: any) {
      // Falhou antes do TUS começar: nada foi enviado, volta ao estado anterior.
      setEnvio(null)
      videoIdEmEnvio.current = null
      tusRef.current = null
      toast.error(err.message ?? 'Erro no upload do vídeo.')
    }
  }

  function concluirEnvio(videoId: string, aguardandoAprovacao: boolean) {
    setEnvio(null)
    tusRef.current = null
    videoIdEmEnvio.current = null
    if (aguardandoAprovacao) {
      setPendente({ videoId, status: 'processing', progresso: 0 })
      toast.success('Vídeo enviado e mandado para aprovação do admin. O vídeo atual continua no ar até a resposta.')
    } else {
      setAtual({ status: 'processing', progresso: 0, duracao: null })
      onChangeRef.current?.({ bunny_video_id: videoId, video_status: 'processing', duration_seconds: null })
      toast.success('Vídeo enviado! Agora o Bunny prepara as qualidades de reprodução.')
    }
    emReposicao.current = false
  }

  function pausar() {
    void tusRef.current?.abort()
    setEnvio((e) => (e ? { ...e, fase: 'pausado', velocidade: 0 } : e))
  }

  function retomar() {
    if (!tusRef.current) return
    amostra.current = { t: Date.now(), bytes: amostra.current.bytes, vel: 0 }
    setEnvio((e) => (e ? { ...e, fase: 'enviando' } : e))
    tusRef.current.start()
  }

  async function cancelarEnvio() {
    const videoId = videoIdEmEnvio.current
    try {
      await tusRef.current?.abort(true)
    } catch {
      // o servidor do Bunny pode já ter esquecido o upload; o DELETE abaixo limpa o resto
    }
    tusRef.current = null
    setEnvio(null)
    if (videoId) await apagar(videoId, emReposicao.current ? 'pendente' : 'atual')
    videoIdEmEnvio.current = null
    emReposicao.current = false
  }

  /** Remove um vídeo (da aula ou da troca pendente) e acerta a tela. */
  async function apagar(videoId: string, qual: 'atual' | 'pendente'): Promise<boolean> {
    try {
      const res = await fetch('/api/bunny/video', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, videoId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Não foi possível remover o vídeo.')
      }
      if (qual === 'pendente') {
        setPendente(null)
        onPedidoRef.current?.(null)
      } else {
        setAtual({ status: 'none', progresso: 0, duracao: null })
        setVideoIdAtual(null)
        setPrevia(false)
        onChangeRef.current?.({ bunny_video_id: null, video_status: 'none', duration_seconds: null })
      }
      return true
    } catch (err: any) {
      toast.error(err.message ?? 'Não foi possível remover o vídeo.')
      return false
    }
  }

  async function removerAtual() {
    if (!confirm('Remover o vídeo desta aula? Esta ação não pode ser desfeita.')) return
    setRemovendo(true)
    if (videoIdAtual && (await apagar(videoIdAtual, 'atual'))) toast.success('Vídeo removido.')
    setRemovendo(false)
  }

  async function cancelarPedido() {
    if (!pendente) return
    setRemovendo(true)
    if (await apagar(pendente.videoId, 'pendente')) toast.success('Troca cancelada. O vídeo atual segue no ar.')
    setRemovendo(false)
  }

  // ── Escolha do arquivo ─────────────────────────────────────────────────
  function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite escolher o mesmo arquivo de novo depois de cancelar
    if (file) void iniciar(file)
  }

  function aoSoltar(e: React.DragEvent) {
    e.preventDefault()
    setArrastando(false)
    if (enviando) return
    const file = e.dataTransfer.files?.[0]
    if (file) void iniciar(file)
  }

  // ── Render ─────────────────────────────────────────────────────────────
  const temVideo = atual.status !== 'none'
  const pct = envio ? Math.min(100, Math.floor((envio.enviado / envio.tamanho) * 100)) : 0
  const eta = envio && envio.velocidade > 0 ? formatEta((envio.tamanho - envio.enviado) / envio.velocidade) : ''
  const mostrarDropzone = !enviando && envio?.fase !== 'erro'

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-label="Escolher arquivo de vídeo"
        onChange={aoEscolher}
      />

      {/* Estado do vídeo que está na aula */}
      {atual.status === 'ready' && !envio && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3">
          <div className="flex flex-wrap items-center gap-3">
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-tinta">Vídeo pronto</p>
              {atual.duracao ? (
                <p className="text-xs text-tinta-suave">Duração: {formatDuration(atual.duracao)}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setPrevia((v) => !v)}>
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                {previa ? 'Fechar prévia' : 'Assistir'}
              </Button>
              {!temAlunos && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  loading={removendo}
                  onClick={removerAtual}
                  className="hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Remover
                </Button>
              )}
            </div>
          </div>
          {previa && (
            <div className="mt-3">
              <VideoPlayer lessonId={lessonId} />
            </div>
          )}
        </div>
      )}

      {atual.status === 'processing' && !envio && (
        <div className="rounded-md border border-cobalto/20 bg-cobalto/5 p-3" role="status">
          <div className="flex items-center gap-3">
            <Clapperboard className="h-5 w-5 shrink-0 text-cobalto" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-tinta">Preparando o vídeo…</p>
              <p className="text-xs text-tinta-suave">
                Pode levar alguns minutos. Pode sair daqui — o vídeo fica pronto sozinho.
              </p>
              <div
                className="mt-2 h-1.5 w-full overflow-hidden rounded-sm bg-cobalto/15"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={atual.progresso}
                aria-label="Progresso do processamento"
              >
                <div
                  className="h-full rounded-sm bg-cobalto transition-all duration-500"
                  style={{ width: `${Math.max(atual.progresso, 4)}%` }}
                />
              </div>
            </div>
            <span className="text-xs tabular-nums text-tinta-suave">{atual.progresso}%</span>
          </div>
        </div>
      )}

      {atual.status === 'failed' && !envio && (
        <Notice
          tipo="erro"
          role="alert"
          titulo="O vídeo não pôde ser processado"
          acao={
            <Button type="button" size="sm" variant="outline" loading={removendo} onClick={removerAtual}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Descartar
            </Button>
          }
        >
          O arquivo pode estar corrompido ou usar um codec incomum. Exporte de novo em MP4 (H.264) e envie outra vez.
        </Notice>
      )}

      {atual.status === 'uploading' && !enviando && !emReposicao.current && envio?.fase !== 'erro' && (
        <Notice
          tipo="atencao"
          role="status"
          titulo="Envio incompleto"
          acao={
            <Button type="button" size="sm" variant="outline" loading={removendo} onClick={removerAtual}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Descartar
            </Button>
          }
        >
          O envio anterior foi interrompido antes de terminar. Escolha o arquivo de novo para recomeçar.
        </Notice>
      )}

      {/* Troca aguardando o admin */}
      {pendente && !envio && (
        <Notice
          tipo="atencao"
          icon={Clock}
          titulo="Vídeo novo aguardando aprovação do admin"
          acao={
            <Button type="button" size="sm" variant="outline" loading={removendo} onClick={cancelarPedido}>
              Cancelar troca
            </Button>
          }
        >
          {pendente.status === 'processing' && `Ainda sendo preparado (${pendente.progresso}%). `}
          {pendente.status === 'failed' && 'O novo vídeo falhou no processamento — cancele e envie outro. '}
          O vídeo atual continua no ar até a resposta.
        </Notice>
      )}

      {/* Envio em andamento */}
      {envio && (
        <div className="rounded-md border border-brasa/30 bg-white p-3">
          <div className="flex items-start gap-3">
            <Film className="mt-0.5 h-5 w-5 shrink-0 text-brasa-escura" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-tinta">{envio.nome}</p>
              <p className="text-xs text-tinta-suave">
                {formatBytes(envio.enviado)} de {formatBytes(envio.tamanho)}
                {envio.fase === 'enviando' && envio.velocidade > 0 && (
                  <> · {formatBytes(envio.velocidade)}/s{eta && <> · faltam {eta}</>}</>
                )}
                {envio.fase === 'pausado' && ' · pausado'}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-tinta">{pct}%</span>
          </div>

          <div
            className="mt-3 h-2 w-full overflow-hidden rounded-sm bg-cobalto/15"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="Progresso do envio"
          >
            <div
              className={cn(
                'h-full rounded-sm transition-all duration-300',
                envio.fase === 'erro' ? 'bg-red-500' : envio.fase === 'pausado' ? 'bg-tinta-suave/50' : 'bg-brasa'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>

          {envio.fase === 'erro' && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-red-700" role="alert">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              O envio foi interrompido (conexão instável?). O que já subiu fica guardado — retome quando quiser.
            </p>
          )}

          {envio.avisos.map((a) => (
            <p key={a} className="mt-2 flex items-start gap-1.5 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {a}
            </p>
          ))}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {envio.fase === 'enviando' ? (
              <Button type="button" size="sm" variant="outline" onClick={pausar}>
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                Pausar
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={retomar}>
                {envio.fase === 'erro' ? (
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {envio.fase === 'erro' ? 'Tentar de novo' : 'Retomar'}
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" onClick={cancelarEnvio} className="hover:text-red-700">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Cancelar envio
            </Button>
            {envio.fase === 'enviando' && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-tinta-suave">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Mantenha esta página aberta
              </span>
            )}
          </div>
        </div>
      )}

      {/* Dropzone */}
      {mostrarDropzone && (
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setArrastando(true)
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={aoSoltar}
            className={cn(
              'flex w-full flex-col items-center gap-1.5 rounded-md border-2 border-dashed px-4 text-center transition-colors',
              temVideo || pendente ? 'py-4' : 'py-8',
              arrastando
                ? 'border-brasa bg-brasa/10'
                : 'border-cobalto/25 bg-white hover:border-brasa/60 hover:bg-brasa/5'
            )}
          >
            <Upload className="h-6 w-6 text-brasa-escura" aria-hidden="true" />
            <span className="text-sm font-semibold text-tinta">
              {arrastando
                ? 'Solte o vídeo aqui'
                : temVideo
                  ? 'Trocar o vídeo'
                  : 'Arraste o vídeo aqui ou clique para escolher'}
            </span>
            <span className="text-xs text-tinta-suave">
              MP4, MOV, WebM, MKV ou AVI · até 5 GB
            </span>
          </button>

          <p className="mt-1.5 text-xs text-tinta-suave/80">
            Para ficar bom de assistir: <strong className="font-semibold">horizontal (16:9), 1080p, MP4 com H.264</strong>.
            O Bunny gera as qualidades menores sozinho, então quem tem internet lenta também assiste.
          </p>
          {temAlunos && (atual.status === 'ready' || atual.status === 'processing') && (
            <p className="mt-1 text-xs text-amber-800">
              Este curso já tem alunos: o vídeo novo só entra no ar depois que o admin aprovar.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
