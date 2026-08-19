'use client'

import { useEffect, useState } from 'react'
import {
  EVENTO_CONSENTIMENTO,
  gravarConsentimento,
  lerConsentimento,
  limparConsentimento,
  type Consentimento,
} from '@/lib/consentimento'
import { Button } from '@/components/ui/button'

/**
 * Decisão 9.5. Aparece só enquanto não houver escolha guardada — e volta a
 * aparecer quando a pessoa clica em "Cookies" no rodapé, porque
 * consentimento que não dá pra retirar não é consentimento.
 *
 * As duas opções têm o mesmo peso visual: um "Aceitar" em destaque com o
 * "Recusar" em cinza claro é o padrão escuro que a ANPD reclama.
 */
export function CookieConsent() {
  const [escolha, setEscolha] = useState<Consentimento | null | undefined>(undefined)

  useEffect(() => {
    setEscolha(lerConsentimento())

    function aoMudar(e: Event) {
      setEscolha((e as CustomEvent<Consentimento | null>).detail)
    }
    window.addEventListener(EVENTO_CONSENTIMENTO, aoMudar)
    return () => window.removeEventListener(EVENTO_CONSENTIMENTO, aoMudar)
  }, [])

  // `undefined` é "ainda não li o localStorage": renderizar o banner antes
  // disso faria ele piscar em toda visita de quem já respondeu.
  if (escolha !== null) return null

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="titulo-cookies"
      className="fixed inset-x-0 bottom-0 z-90 border-t border-cobalto/20 bg-cal p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] sm:p-5"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p id="titulo-cookies" className="font-display font-bold tracking-tight text-tinta">
            Cookies e medição
          </p>
          <p className="mt-1 text-sm leading-relaxed text-tinta-suave">
            O que mantém você logado e guarda o carrinho é essencial e não dá pra desligar. Além
            disso, gostaríamos de medir como as pessoas usam o site para melhorar as aulas e a
            loja. Você escolhe.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button size="sm" onClick={() => gravarConsentimento(true)}>
            Aceitar medição
          </Button>
          <Button size="sm" variant="outline" onClick={() => gravarConsentimento(false)}>
            Só o essencial
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Reabre o banner. Fica no rodapé — é como a escolha é retirada. */
export function BotaoCookies({ className }: { className?: string }) {
  return (
    <button type="button" onClick={limparConsentimento} className={className}>
      Cookies
    </button>
  )
}
