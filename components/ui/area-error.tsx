'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Corpo dos `error.tsx` de cada área logada. Como o arquivo fica dentro do
 * layout da área, a sidebar continua na tela: uma query que falha troca só o
 * conteúdo por esta mensagem, em vez de derrubar a página inteira.
 */
export function AreaError({
  error,
  reset,
  voltarHref,
  voltarTexto,
}: {
  error: Error & { digest?: string }
  reset: () => void
  voltarHref: string
  voltarTexto: string
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div role="alert" className="flex flex-col items-center px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-bold tracking-tight text-tinta">Algo deu errado</h1>
      <p className="mt-3 max-w-md text-tinta-suave">
        Não foi possível carregar esta página. Tente novamente em instantes.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>Tentar novamente</Button>
        <Link href={voltarHref}>
          <Button variant="outline">{voltarTexto}</Button>
        </Link>
      </div>
    </div>
  )
}
