'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, AlertCircle, Clapperboard, RotateCcw } from 'lucide-react'

interface VideoPlayerProps {
  lessonId: string
  /** Segundos de onde retomar. Ignorado abaixo de 10s (não vale o susto). */
  startAt?: number
  /** Grava a posição para "continuar de onde parou". Só o aluno assistindo — a pré-visualização do professor não. */
  salvarPosicao?: boolean
  onEnded?: () => void
  /** 0–1, chamado a cada timeupdate. */
  onProgress?: (fracao: number) => void
}

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'processando'; progresso: number; enviando: boolean }
  | { tipo: 'erro'; mensagem: string; falhou?: boolean }
  | { tipo: 'pronto'; url: string }

const ORIGEM_BUNNY = 'https://iframe.mediadelivery.net'
const INTERVALO_SALVAR_MS = 15_000
const PLAYERJS = { context: 'player.js', version: '0.0.11' } as const

function formatarTempo(seg: number) {
  const m = Math.floor(seg / 60)
  const s = Math.floor(seg % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function VideoPlayer({ lessonId, startAt = 0, salvarPosicao = false, onEnded, onProgress }: VideoPlayerProps) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })
  const [tentativa, setTentativa] = useState(0)
  const [retomadoDe, setRetomadoDe] = useState<number | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Callbacks e posição em refs: o listener de `message` é registrado uma vez
  // por vídeo, e não pode ser refeito toda vez que o pai renderiza (a lista de
  // eventos do player seria assinada em duplicidade).
  const onEndedRef = useRef(onEnded)
  const onProgressRef = useRef(onProgress)
  onEndedRef.current = onEnded
  onProgressRef.current = onProgress
  const ultimaPosicao = useRef(0)
  const ultimoSalvo = useRef(0)
  const escutando = useRef(false)

  // 1. Autorização + status. Enquanto o vídeo codifica, repete até ficar pronto.
  useEffect(() => {
    let cancelado = false
    let timer: ReturnType<typeof setTimeout> | undefined
    setEstado({ tipo: 'carregando' })
    escutando.current = false

    async function carregar() {
      try {
        const res = await fetch(`/api/bunny/signed-url?lessonId=${lessonId}`, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (cancelado) return

        if (data.signedUrl) {
          setEstado({ tipo: 'pronto', url: data.signedUrl })
        } else if (res.status === 202 && (data.status === 'processing' || data.status === 'uploading')) {
          setEstado({
            tipo: 'processando',
            progresso: data.progresso ?? 0,
            enviando: data.status === 'uploading',
          })
          timer = setTimeout(carregar, 6000)
        } else if (res.status === 202) {
          setEstado({
            tipo: 'erro',
            falhou: true,
            mensagem: 'Houve um problema com este vídeo. Avise o professor ou tente mais tarde.',
          })
        } else {
          setEstado({ tipo: 'erro', mensagem: data.error ?? 'Erro ao carregar vídeo' })
        }
      } catch {
        if (!cancelado) setEstado({ tipo: 'erro', mensagem: 'Erro ao carregar vídeo' })
      }
    }

    carregar()
    return () => {
      cancelado = true
      if (timer) clearTimeout(timer)
    }
  }, [lessonId, tentativa])

  const gravarPosicao = useCallback(
    (segundos: number, { sair = false } = {}) => {
      if (!salvarPosicao) return
      ultimoSalvo.current = Date.now()
      // `keepalive` deixa a requisição terminar mesmo com a aba fechando.
      fetch('/api/aulas/posicao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, seconds: segundos }),
        keepalive: sair,
      }).catch(() => {})
    },
    [lessonId, salvarPosicao]
  )

  // 2. Conversa com o player do Bunny (protocolo Player.js, via postMessage).
  useEffect(() => {
    if (estado.tipo !== 'pronto') return

    const enviar = (method: string, value?: unknown) =>
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ ...PLAYERJS, method, ...(value !== undefined ? { value } : {}) }),
        ORIGEM_BUNNY
      )

    const assinar = () => {
      if (escutando.current) return
      escutando.current = true
      for (const evento of ['timeupdate', 'pause', 'ended']) enviar('addEventListener', evento)
      if (startAt >= 10) {
        enviar('setCurrentTime', startAt)
        setRetomadoDe(startAt)
      }
    }

    const handler = (e: MessageEvent) => {
      if (e.origin !== ORIGEM_BUNNY || e.source !== iframeRef.current?.contentWindow) return
      let msg: any = e.data
      if (typeof msg === 'string') {
        try { msg = JSON.parse(msg) } catch { return }
      }
      if (!msg || msg.context !== 'player.js') return

      switch (msg.event) {
        case 'ready':
          assinar()
          break
        case 'timeupdate': {
          const { seconds, duration } = msg.value ?? {}
          if (typeof seconds !== 'number') break
          ultimaPosicao.current = seconds
          if (typeof duration === 'number' && duration > 0) onProgressRef.current?.(seconds / duration)
          if (Date.now() - ultimoSalvo.current >= INTERVALO_SALVAR_MS) gravarPosicao(seconds)
          break
        }
        case 'pause':
          gravarPosicao(ultimaPosicao.current)
          break
        case 'ended':
          // Terminou: a próxima visita começa do zero, não dos últimos segundos.
          ultimaPosicao.current = 0
          gravarPosicao(0)
          onEndedRef.current?.()
          break
      }
    }

    window.addEventListener('message', handler)
    // Alguns embeds já emitiram `ready` antes do listener existir.
    const fallback = setTimeout(assinar, 2500)

    const aoSair = () => {
      if (ultimaPosicao.current > 0) gravarPosicao(ultimaPosicao.current, { sair: true })
    }
    window.addEventListener('pagehide', aoSair)

    return () => {
      window.removeEventListener('message', handler)
      window.removeEventListener('pagehide', aoSair)
      clearTimeout(fallback)
      aoSair()
    }
  }, [estado.tipo, startAt, gravarPosicao])

  // O aviso "retomamos de…" some sozinho.
  useEffect(() => {
    if (retomadoDe === null) return
    const t = setTimeout(() => setRetomadoDe(null), 8000)
    return () => clearTimeout(t)
  }, [retomadoDe])

  if (estado.tipo === 'erro') {
    return (
      <div className="aspect-video bg-cobalto-escuro rounded-md flex items-center justify-center p-4">
        <div className="text-center text-white">
          <AlertCircle className="h-10 w-10 mx-auto mb-2 text-red-400" aria-hidden="true" />
          <p className="text-sm text-white/80 max-w-sm">{estado.mensagem}</p>
          {!estado.falhou && (
            <button
              type="button"
              onClick={() => setTentativa((n) => n + 1)}
              className="mt-3 inline-flex items-center gap-2 rounded-sm border border-white/30 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Tentar de novo
            </button>
          )}
        </div>
      </div>
    )
  }

  if (estado.tipo === 'processando') {
    return (
      <div className="aspect-video bg-cobalto-escuro rounded-md flex items-center justify-center p-4" role="status">
        <div className="text-center text-white">
          <Clapperboard className="h-10 w-10 mx-auto mb-2 text-brasa-clara" aria-hidden="true" />
          <p className="text-sm font-semibold">
            {estado.enviando ? 'O vídeo ainda está sendo enviado' : 'Vídeo sendo preparado'}
          </p>
          <p className="mt-1 text-xs text-white/70">
            {estado.enviando || estado.progresso === 0
              ? 'Esta tela atualiza sozinha quando ele ficar pronto.'
              : `${estado.progresso}% — esta tela atualiza sozinha quando ele ficar pronto.`}
          </p>
        </div>
      </div>
    )
  }

  if (estado.tipo === 'carregando') {
    return (
      <div className="aspect-video bg-cobalto-escuro rounded-md flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white animate-spin" aria-label="Carregando vídeo" />
      </div>
    )
  }

  return (
    <div className="relative aspect-video rounded-md overflow-hidden bg-black">
      <iframe
        ref={iframeRef}
        src={estado.url}
        title="Vídeo da aula"
        className="w-full h-full"
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      />
      {retomadoDe !== null && (
        <div className="pointer-events-none absolute left-3 top-3 right-3 flex justify-start">
          <div className="pointer-events-auto flex items-center gap-3 rounded-sm bg-black/75 px-3 py-2 text-xs text-white backdrop-blur-sm">
            <span>Retomando de {formatarTempo(retomadoDe)}</span>
            <button
              type="button"
              className="font-semibold text-brasa-clara underline-offset-2 hover:underline"
              onClick={() => {
                iframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({ ...PLAYERJS, method: 'setCurrentTime', value: 0 }),
                  ORIGEM_BUNNY
                )
                setRetomadoDe(null)
              }}
            >
              Começar do início
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
