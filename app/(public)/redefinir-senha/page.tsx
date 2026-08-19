import type { Metadata } from 'next'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Redefinir senha',
  robots: { index: false, follow: false },
}

export default function RedefinirSenhaPage() {
  return (
    <AuthLayout
      olho="Chefio"
      titulo="Uma senha nova e pronto."
      descricao="Suas aulas, anotações e pedidos continuam exatamente onde estavam."
    >
      <ResetPasswordForm />
    </AuthLayout>
  )
}
