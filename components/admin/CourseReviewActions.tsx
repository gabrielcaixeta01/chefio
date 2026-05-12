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

  if (currentStatus === 'approved') {
    return (
      <span className="text-xs text-green-600 flex items-center gap-1 shrink-0">
        <CheckCircle className="h-3.5 w-3.5" /> Aprovado
      </span>
    )
  }

  if (currentStatus !== 'pending_review') return null

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Button
        size="sm"
        variant="outline"
        className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
        disabled={!!loading}
        onClick={() => updateStatus('approved')}
      >
        <CheckCircle className="h-3.5 w-3.5" />
        {loading === 'approve' ? 'Aprovando...' : 'Aprovar'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
        disabled={!!loading}
        onClick={() => updateStatus('rejected')}
      >
        <XCircle className="h-3.5 w-3.5" />
        {loading === 'reject' ? 'Rejeitando...' : 'Rejeitar'}
      </Button>
    </div>
  )
}
