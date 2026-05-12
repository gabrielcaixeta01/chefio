'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'

export function CourseSubmitButton({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('courses')
      .update({ status: 'pending_review' })
      .eq('id', courseId)

    if (error) {
      toast.error('Erro ao enviar para revisão.')
    } else {
      toast.success('Curso enviado para revisão!')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Button onClick={handleSubmit} disabled={loading} className="gap-2">
      <Send className="h-4 w-4" />
      {loading ? 'Enviando...' : 'Enviar para revisão'}
    </Button>
  )
}
