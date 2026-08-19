'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PRAZO_REVISAO_DIAS_UTEIS } from '@/lib/utils'
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
      // Decisão 5.5: o prazo é prometido no momento do envio, que é quando
      // a pergunta "quanto tempo isso demora?" aparece.
      toast.success(`Curso enviado! A resposta sai em até ${PRAZO_REVISAO_DIAS_UTEIS} dias úteis.`)
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
