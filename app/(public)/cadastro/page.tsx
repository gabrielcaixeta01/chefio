import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { AuthLayout } from '@/components/auth/AuthLayout'

export const metadata: Metadata = { title: 'Criar conta' }

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const { role } = await searchParams

  // Os CTAs "Quero ensinar" apontam para /cadastro?role=teacher — sem ler isso
  // aqui, a pessoa cai no formulário com "Aluno" já marcado.
  const papelInicial = role === 'teacher' ? 'teacher' : 'student'

  const ensinando = papelInicial === 'teacher'

  return (
    <AuthLayout
      olho={ensinando ? 'Para quem ensina' : 'Chefio'}
      titulo={
        ensinando
          ? 'Sua cozinha vira sala de aula.'
          : 'Sua primeira aula começa aqui.'
      }
      descricao={
        ensinando
          ? 'Publique seu curso, defina seu preço e receba por matrícula.'
          : 'Acesso às aulas em vídeo, caderno digital e à loja de ingredientes.'
      }
    >
      <RegisterForm papelInicial={papelInicial} />
    </AuthLayout>
  )
}
