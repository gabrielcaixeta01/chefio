'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle } from 'lucide-react'

const ERROS_CHECKOUT: Record<string, string> = {
  stripe_nao_configurado: 'Pagamentos estão temporariamente indisponíveis. Tente novamente em instantes.',
  matricula_falhou: 'Não foi possível concluir sua inscrição. Tente novamente em instantes.',
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

    // createClient() lança quando as NEXT_PUBLIC_* faltaram no build. Sem o
    // try, a exceção subia sem tratamento e o status ficava em 'checking'
    // para sempre — a caixa de compra virava um retângulo pulsando eterno.
    // Cair em 'anonymous' mostra o CTA de login, onde o erro aparece com
    // mensagem de verdade em vez de silêncio.
    let supabase: ReturnType<typeof createClient>
    try {
      supabase = createClient()
    } catch {
      setStatus('anonymous')
      return
    }

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
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
      .catch(() => {
        if (ativo) setStatus('anonymous')
      })

    return () => {
      ativo = false
    }
  }, [courseId])

  return (
    <>
      {erro && ERROS_CHECKOUT[erro] && (
        <Notice tipo="erro" role="alert" className="mt-4">
          {ERROS_CHECKOUT[erro]}
        </Notice>
      )}

      <div className="mt-4">
        {/* Skeleton da marca (cal apagada com o vidrado varrendo) em vez do
            animate-pulse genérico — é o mesmo bloco que o resto do site usa
            enquanto carrega. */}
        {status === 'checking' && <Skeleton className="h-12 w-full" />}

        {status === 'enrolled' && (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Você já tem este curso
            </p>
            <Link href={`/aluno/cursos/${courseSlug}`} className="block">
              <Button className="w-full" size="lg">Continuar assistindo</Button>
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
