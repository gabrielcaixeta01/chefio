'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle } from 'lucide-react'

const ERROS_CHECKOUT: Record<string, string> = {
  stripe_nao_configurado: 'Pagamentos estão temporariamente indisponíveis. Tente novamente em instantes.',
}

type Status = 'checking' | 'anonymous' | 'enrolled' | 'not_enrolled'

interface PurchaseBoxProps {
  courseId: string
  courseSlug: string
  price: number
}

/**
 * Único pedaço da página do curso que depende de sessão — isolado num client
 * component pra `/curso/[slug]` poder ser prerenderizada com ISR (o resto do
 * conteúdo é público). `useSearchParams()` aqui dentro exige que o pai
 * envolva isso num <Suspense>, senão a rota inteira volta a ficar dinâmica.
 */
export function PurchaseBox({ courseId, courseSlug, price }: PurchaseBoxProps) {
  const [status, setStatus] = useState<Status>('checking')
  const erro = useSearchParams().get('erro')

  useEffect(() => {
    let ativo = true
    const supabase = createClient()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        if (ativo) setStatus('anonymous')
        return
      }
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', session.user.id)
        .eq('course_id', courseId)
        .maybeSingle()
      if (ativo) setStatus(enrollment ? 'enrolled' : 'not_enrolled')
    })

    return () => {
      ativo = false
    }
  }, [courseId])

  return (
    <>
      {erro && ERROS_CHECKOUT[erro] && (
        <div className="mt-4 flex items-start gap-2 rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{ERROS_CHECKOUT[erro]}</p>
        </div>
      )}

      <div className="mt-4">
        {status === 'checking' && (
          <div className="h-12 w-full rounded-md bg-cobalto/10 animate-pulse" aria-hidden="true" />
        )}

        {status === 'enrolled' && (
          <div className="space-y-3">
            <Badge variant="success" className="w-full justify-center py-2">
              ✓ Você já tem este curso
            </Badge>
            <Link href={`/aluno/cursos/${courseSlug}`} className="block">
              <Button className="w-full">Continuar assistindo</Button>
            </Link>
          </div>
        )}

        {status === 'not_enrolled' && (
          <form action="/api/stripe/checkout" method="POST">
            <input type="hidden" name="courseId" value={courseId} />
            <Button type="submit" className="w-full" size="lg">
              {price === 0 ? 'Inscrever-se grátis' : 'Comprar curso'}
            </Button>
          </form>
        )}

        {status === 'anonymous' && (
          <Link href={`/login?next=/curso/${courseSlug}`}>
            <Button className="w-full" size="lg">
              {price === 0 ? 'Inscrever-se grátis' : 'Comprar curso'}
            </Button>
          </Link>
        )}
      </div>
    </>
  )
}
