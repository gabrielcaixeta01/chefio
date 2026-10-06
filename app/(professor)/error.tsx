'use client'

import { AreaError } from '@/components/ui/area-error'

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <AreaError {...props} voltarHref="/professor" voltarTexto="Ir para o painel" />
}
