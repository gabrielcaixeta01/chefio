'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/* Barra de brasa no topo da janela durante a troca de rota.

   Por que existe, se já temos `loading.tsx`: o App Router só troca a tela
   depois que o servidor devolve o primeiro byte. Nesse intervalo — que numa
   conexão ruim passa de um segundo — a tela antiga fica intacta e o clique
   parece não ter acontecido. A barra cobre exatamente essa janela.

   O avanço é assintótico: corre rápido até ~45%, desacelera e nunca chega
   sozinha em 100%. Só a rota concluída fecha a barra. Isso é honesto — a
   barra representa "ainda estou esperando", não uma porcentagem inventada. */

const ATRASO_ATE_APARECER = 140 // navegação instantânea não deve piscar nada
const TETO_SEM_RESPOSTA = 92

function BarraDeRota() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const rotaAtual = `${pathname}?${searchParams}`

  const [progresso, setProgresso] = useState(0)
  const [visivel, setVisivel] = useState(false)

  const rotaEmEspera = useRef<string | null>(null)
  const timers = useRef<number[]>([])

  const limparTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }, [])

  const iniciar = useCallback(() => {
    if (rotaEmEspera.current !== null) return
    rotaEmEspera.current = rotaAtual
    limparTimers()

    timers.current.push(
      window.setTimeout(() => {
        setVisivel(true)
        setProgresso(12)

        const avancar = () => {
          setProgresso((p) => {
            if (p >= TETO_SEM_RESPOSTA) return p
            // Quanto mais perto do teto, menor o passo: a barra desacelera
            // em vez de bater na parede.
            const passo = Math.max(0.6, (TETO_SEM_RESPOSTA - p) * 0.14)
            return Math.min(TETO_SEM_RESPOSTA, p + passo)
          })
          timers.current.push(window.setTimeout(avancar, 180))
        }
        avancar()
      }, ATRASO_ATE_APARECER)
    )
  }, [rotaAtual, limparTimers])

  const concluir = useCallback(() => {
    rotaEmEspera.current = null
    limparTimers()
    setProgresso(100)
    timers.current.push(
      window.setTimeout(() => setVisivel(false), 220)
    )
    timers.current.push(window.setTimeout(() => setProgresso(0), 520))
  }, [limparTimers])

  // Fim da navegação: a URL mudou, então a nova rota já renderizou.
  useEffect(() => {
    if (rotaEmEspera.current !== null && rotaEmEspera.current !== rotaAtual) {
      concluir()
    }
  }, [rotaAtual, concluir])

  useEffect(() => {
    // 1) Cliques em <Link> e <a>. Pega a esmagadora maioria das navegações.
    const aoClicar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const alvo = (e.target as HTMLElement | null)?.closest('a')
      if (!alvo) return
      if (alvo.target && alvo.target !== '_self') return
      if (alvo.hasAttribute('download')) return

      const href = alvo.getAttribute('href')
      if (!href || href.startsWith('#')) return

      let destino: URL
      try {
        destino = new URL(alvo.href, window.location.href)
      } catch {
        return
      }
      if (destino.origin !== window.location.origin) return
      // Mesma URL não navega; só âncora também não troca de tela.
      if (destino.pathname + destino.search === window.location.pathname + window.location.search) return

      iniciar()
    }

    // 2) router.push/replace chamados por código (formulários, redirects).
    const pushOriginal = window.history.pushState
    const replaceOriginal = window.history.replaceState

    window.history.pushState = function (...args) {
      iniciar()
      return pushOriginal.apply(this, args as Parameters<typeof pushOriginal>)
    }
    window.history.replaceState = function (...args) {
      return replaceOriginal.apply(this, args as Parameters<typeof replaceOriginal>)
    }

    document.addEventListener('click', aoClicar, true)
    window.addEventListener('popstate', iniciar)

    return () => {
      document.removeEventListener('click', aoClicar, true)
      window.removeEventListener('popstate', iniciar)
      window.history.pushState = pushOriginal
      window.history.replaceState = replaceOriginal
    }
  }, [iniciar])

  useEffect(() => limparTimers, [limparTimers])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
      role="status"
      aria-live="polite"
      aria-label={visivel ? 'Carregando página' : ''}
    >
      <div
        className="h-full origin-left bg-brasa transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progresso}%`,
          opacity: visivel ? 1 : 0,
          // Rastro de calor na ponta: dá a sensação de que a barra está
          // correndo, não sendo redesenhada em degraus.
          boxShadow: visivel
            ? '0 0 12px 1px color-mix(in srgb, var(--color-brasa) 70%, transparent)'
            : 'none',
        }}
      />
    </div>
  )
}

/** `useSearchParams` exige fronteira de Suspense pra não derrubar a geração
    estática das páginas públicas. */
export function RouteProgress() {
  return (
    <Suspense fallback={null}>
      <BarraDeRota />
    </Suspense>
  )
}
