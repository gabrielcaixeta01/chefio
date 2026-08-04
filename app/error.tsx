'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ChefHat } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <Link
        href="/"
        className="flex items-center gap-2 font-bold text-xl text-orange-600 mb-8"
      >
        <ChefHat className="h-6 w-6" />
        <span>Chefio</span>
      </Link>

      <h1 className="text-3xl font-bold text-gray-900">Algo deu errado</h1>
      <p className="mt-3 max-w-md text-gray-600">
        Não foi possível carregar esta página. Tente novamente ou volte para a
        home.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={reset}>
          Tentar novamente
        </Button>
        <Link href="/">
          <Button variant="outline" size="lg">
            Voltar para a home
          </Button>
        </Link>
      </div>
    </div>
  )
}
