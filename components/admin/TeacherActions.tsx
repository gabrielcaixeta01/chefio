'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { UserCheck, UserX, Percent } from 'lucide-react'

interface TeacherActionsProps {
  teacherProfileId: string
  userId: string
  currentStatus: string
  currentCommission: number
}

export function TeacherActions({ teacherProfileId, userId, currentStatus, currentCommission }: TeacherActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [editingCommission, setEditingCommission] = useState(false)
  const [commission, setCommission] = useState(currentCommission)
  const router = useRouter()

  async function toggleStatus() {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
    setLoading('status')
    const supabase = createClient()
    const { error } = await supabase
      .from('teacher_profiles')
      .update({ status: newStatus })
      .eq('id', teacherProfileId)

    if (error) toast.error('Erro ao atualizar status.')
    else {
      toast.success(newStatus === 'active' ? 'Professor ativado.' : 'Professor suspenso.')
      router.refresh()
    }
    setLoading(null)
  }

  async function saveCommission() {
    const value = Math.min(100, Math.max(0, commission))
    setLoading('commission')
    const supabase = createClient()
    const { error } = await supabase
      .from('teacher_profiles')
      .update({ commission_rate: value })
      .eq('id', teacherProfileId)

    if (error) toast.error('Erro ao atualizar comissão.')
    else {
      toast.success(`Comissão atualizada para ${value}%.`)
      setEditingCommission(false)
      router.refresh()
    }
    setLoading(null)
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      {editingCommission ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            value={commission}
            onChange={(e) => setCommission(Number(e.target.value))}
            className="w-16 h-8 text-sm border border-cobalto/20 rounded px-2 text-center"
          />
          <span className="text-sm text-tinta-suave">%</span>
          <Button size="sm" onClick={saveCommission} disabled={loading === 'commission'}>
            {loading === 'commission' ? '...' : 'Salvar'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditingCommission(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-tinta-suave"
            onClick={() => setEditingCommission(true)}
          >
            <Percent className="h-3.5 w-3.5" />
            Comissão
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={`gap-1 ${currentStatus === 'active' ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
            disabled={loading === 'status'}
            onClick={toggleStatus}
          >
            {currentStatus === 'active' ? (
              <><UserX className="h-3.5 w-3.5" />{loading === 'status' ? '...' : 'Suspender'}</>
            ) : (
              <><UserCheck className="h-3.5 w-3.5" />{loading === 'status' ? '...' : 'Ativar'}</>
            )}
          </Button>
        </>
      )}
    </div>
  )
}
