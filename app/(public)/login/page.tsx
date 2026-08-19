import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { LIMITE_SESSOES } from '@/lib/auth/sessoes'

export const metadata: Metadata = { title: 'Login' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>
}) {
  const { next, erro } = await searchParams

  // Só caminho interno: `next` vem da URL e mandaria a pessoa para fora do site
  const destino = next?.startsWith('/') && !next.startsWith('//') ? next : undefined

  return (
    <AuthLayout
      olho="Chefio"
      titulo="A cozinha continua de onde você parou."
      descricao="Suas aulas, anotações e pedidos ficam salvos na sua conta."
    >
      <LoginForm
        next={destino}
        aviso={
          erro === 'sessao_encerrada'
            ? `Sua conta pode ficar aberta em até ${LIMITE_SESSOES} aparelhos ao mesmo tempo. Este aqui foi desconectado por um acesso mais recente.`
            : undefined
        }
      />
    </AuthLayout>
  )
}
