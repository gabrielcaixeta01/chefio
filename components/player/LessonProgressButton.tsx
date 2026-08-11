'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { marcarAulaConcluida } from '@/lib/actions/progress'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle } from 'lucide-react'

interface LessonProgressButtonProps {
  lessonId: string
  isCompleted: boolean
  nextLessonId?: string
  courseSlug: string
}

export function LessonProgressButton({
  lessonId,
  isCompleted: initialCompleted,
  nextLessonId,
  courseSlug,
}: LessonProgressButtonProps) {
  const [completed, setCompleted] = useState(initialCompleted)
  const [pendente, startTransition] = useTransition()
  const router = useRouter()

  function irParaProxima() {
    if (nextLessonId) router.push(`/aluno/cursos/${courseSlug}/aulas/${nextLessonId}`)
  }

  function marcar() {
    if (completed) {
      irParaProxima()
      return
    }

    startTransition(async () => {
      const { erro } = await marcarAulaConcluida(lessonId)

      if (erro) {
        toast.error(erro)
        return
      }

      setCompleted(true)
      toast.success('Aula concluída!')
      // Navega direto. O setTimeout de 800ms que existia aqui era uma pausa
      // pra dar tempo de ler o toast, mas quem clica em "marcar como
      // concluída" já quer seguir — e o toast sobrevive à navegação.
      irParaProxima()
    })
  }

  return (
    <Button
      onClick={marcar}
      variant={completed ? 'outline' : 'default'}
      className="gap-2"
      loading={pendente}
      loadingText="Salvando…"
    >
      {completed ? (
        <>
          <CheckCircle className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          {nextLessonId ? 'Próxima aula' : 'Concluída'}
        </>
      ) : (
        <>
          <Circle className="h-4 w-4" aria-hidden="true" />
          Marcar como concluída
        </>
      )}
    </Button>
  )
}
