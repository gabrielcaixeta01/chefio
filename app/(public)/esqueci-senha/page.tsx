import type { Metadata } from 'next'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Esqueci minha senha',
  description: 'Receba um link por e-mail para criar uma nova senha da sua conta Chefio.',
}

export default function EsqueciSenhaPage() {
  return (
    <AuthLayout
      olho="Chefio"
      titulo="Sua cozinha continua aí."
      descricao="Os cursos que você comprou não vão a lugar nenhum — é só recuperar o acesso."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  )
}
