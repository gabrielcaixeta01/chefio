'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

interface StripeOnboardingButtonProps {
  isConnected: boolean
  isActive: boolean
}

export function StripeOnboardingButton({ isConnected, isActive }: StripeOnboardingButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/connect/onboarding', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao conectar com Stripe.')
      setLoading(false)
    }
  }

  if (isActive) {
    return (
      <p className="text-sm text-green-600 font-medium">
        Conta ativa. Seus cursos podem ser vendidos normalmente.
      </p>
    )
  }

  return (
    <Button onClick={handleConnect} disabled={loading} className="gap-2">
      <ExternalLink className="h-4 w-4" />
      {loading
        ? 'Redirecionando...'
        : isConnected
        ? 'Continuar cadastro no Stripe'
        : 'Conectar conta Stripe'}
    </Button>
  )
}
