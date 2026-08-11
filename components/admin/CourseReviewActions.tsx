'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Eye } from 'lucide-react'

interface CourseReviewActionsProps {
  courseId: string
  currentStatus: string
}

export function CourseReviewActions({ courseId, currentStatus }: CourseReviewActionsProps) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const router = useRouter()

  async function updateStatus(status: 'approved' | 'rejected') {
    setLoading(status === 'approved' ? 'approve' : 'reject')
    const supabase = createClient()
    const { error } = await supabase
      .from('courses')
      .update({ status })
      .eq('id', courseId)

    if (error) {
      toast.error('Erro ao atualizar status.')
    } else {
      toast.success(status === 'approved' ? 'Curso aprovado!' : 'Curso rejeitado.')
      router.refresh()
    }
    setLoading(null)
  }

  // Quem já foi aprovado não precisa de nada aqui: a pílula de status ao lado
  // na lista já diz "Aprovado", e o texto duplicado só competia com ela.
  if (currentStatus !== 'pending_review') return null

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        className="gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        disabled={!!loading}
        loading={loading === 'approve'}
        loadingText="Aprovando…"
        onClick={() => updateStatus('approved')}
      >
        <CheckCircle className="h-3.5 w-3.5" />
        Aprovar
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="gap-1 border-red-200 text-red-700 hover:bg-red-50"
        disabled={!!loading}
        loading={loading === 'reject'}
        loadingText="Rejeitando…"
        onClick={() => updateStatus('rejected')}
      >
        <XCircle className="h-3.5 w-3.5" />
        Rejeitar
      </Button>
    </div>
  )
}
