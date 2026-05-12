'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle } from 'lucide-react'

interface LessonProgressButtonProps {
  lessonId: string
  studentId: string
  isCompleted: boolean
  nextLessonId?: string
  courseSlug: string
}

export function LessonProgressButton({
  lessonId,
  studentId,
  isCompleted: initialCompleted,
  nextLessonId,
  courseSlug,
}: LessonProgressButtonProps) {
  const [completed, setCompleted] = useState(initialCompleted)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function markComplete() {
    if (completed) {
      if (nextLessonId) router.push(`/aluno/cursos/${courseSlug}/aulas/${nextLessonId}`)
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('lesson_progress').upsert(
      {
        student_id: studentId,
        lesson_id: lessonId,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,lesson_id' }
    )

    if (error) {
      toast.error('Erro ao salvar progresso.')
    } else {
      setCompleted(true)
      toast.success('Aula concluída!')
      if (nextLessonId) {
        setTimeout(() => router.push(`/aluno/cursos/${courseSlug}/aulas/${nextLessonId}`), 800)
      } else {
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <Button
      onClick={markComplete}
      disabled={loading}
      variant={completed ? 'outline' : 'default'}
      className="gap-2"
    >
      {completed ? (
        <>
          <CheckCircle className="h-4 w-4 text-green-600" />
          {nextLessonId ? 'Próxima aula' : 'Concluída'}
        </>
      ) : (
        <>
          <Circle className="h-4 w-4" />
          {loading ? 'Salvando...' : 'Marcar como concluída'}
        </>
      )}
    </Button>
  )
}
