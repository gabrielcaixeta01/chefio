'use client'

import { useEffect, useState } from 'react'
import { consentiuMedicao, EVENTO_CONSENTIMENTO } from '@/lib/consentimento'

/**
 * Portão da decisão 9.5: é aqui dentro que entram Google Analytics, Meta
 * Pixel e qualquer outro script de medição ou anúncio — nunca direto no
 * layout. Sem consentimento, nada é carregado; retirar o consentimento faz
 * os scripts pararem de ser renderizados na navegação seguinte.
 *
 * Está vazio de propósito: nenhuma dessas ferramentas foi instalada ainda. O
 * contador da Vercel fica fora daqui porque não usa cookie nem identifica
 * ninguém — se um dia isso mudar, ele muda de lugar.
 */
export function ScriptsDeMedicao() {
  const [liberado, setLiberado] = useState(false)

  useEffect(() => {
    setLiberado(consentiuMedicao())

    function aoMudar() {
      setLiberado(consentiuMedicao())
    }
    window.addEventListener(EVENTO_CONSENTIMENTO, aoMudar)
    return () => window.removeEventListener(EVENTO_CONSENTIMENTO, aoMudar)
  }, [])

  if (!liberado) return null

  return null
}
