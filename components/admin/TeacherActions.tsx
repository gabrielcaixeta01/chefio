'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { UserCheck, UserX, Percent } from 'lucide-react'

interface TeacherActionsProps {
  teacherProfileId: string
  currentStatus: string
  currentCommission: number
  /** Decisão 1.2: só o perfil dono/financeiro altera comissão. O banco também
   *  barra (trigger guard_teacher_profile_admin_columns) — isto aqui só evita
   *  oferecer um botão que ia falhar. */
  podeEditarComissao: boolean
  /** Decisão 4.2: sem candidatura enviada o banco recusa a aprovação. Deixar
   *  o botão clicável só pra ele voltar com erro não ajuda ninguém. */
  candidaturaEnviada: boolean
}

export function TeacherActions({
  teacherProfileId,
  currentStatus,
  currentCommission,
  podeEditarComissao,
  candidaturaEnviada,
}: TeacherActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [editingCommission, setEditingCommission] = useState(false)
  const [commission, setCommission] = useState(currentCommission)
  const router = useRouter()

  async function mudarStatus(novo: 'active' | 'suspended' | 'rejected') {
    let motivo: string | null = null

    if (novo === 'rejected') {
      // Decisão 4.2: recusar sem dizer por quê deixa o candidato sem saber o
      // que corrigir — e ele pode reenviar, então o motivo é o que evita a
      // segunda candidatura idêntica.
      motivo = prompt('Por que a candidatura foi recusada? (o candidato lê este texto)')
      if (motivo === null) return
      if (!motivo.trim()) {
        toast.error('Escreva o motivo — é o que o candidato vai ler.')
        return
      }
    }

    if (novo === 'suspended' && !confirm('Suspender? Os cursos dele saem do catálogo na hora. Quem já comprou continua assistindo.')) {
      return
    }

    setLoading('status')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('teacher_profiles')
      .update({
        status: novo,
        rejection_reason: motivo?.trim() ?? null,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', teacherProfileId)

    if (error) {
      toast.error(
        error.message.includes('candidatura')
          ? 'Este professor ainda não enviou a candidatura.'
          : 'Erro ao atualizar status.'
      )
    } else {
      toast.success(
        novo === 'active' ? 'Professor aprovado.' : novo === 'rejected' ? 'Candidatura recusada.' : 'Professor suspenso.'
      )
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

    if (error) toast.error(
      error.message.includes('dono/financeiro')
        ? 'Só o perfil dono/financeiro pode alterar a comissão.'
        : 'Erro ao atualizar comissão.'
    )
    else {
      toast.success(`Comissão atualizada para ${value}%.`)
      setEditingCommission(false)
      router.refresh()
    }
    setLoading(null)
  }

  if (editingCommission) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <input
          type="number"
          min={0}
          max={100}
          value={commission}
          onChange={(e) => setCommission(Number(e.target.value))}
          className="h-8 w-16 rounded border border-cobalto/20 px-2 text-center text-sm"
        />
        <span className="text-sm text-tinta-suave">%</span>
        <Button size="sm" onClick={saveCommission} disabled={loading === 'commission'}>
          {loading === 'commission' ? '...' : 'Salvar'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditingCommission(false)}>
          Cancelar
        </Button>
      </div>
    )
  }

  const ocupado = loading === 'status'

  return (
    <div className="flex shrink-0 items-center gap-2">
      {podeEditarComissao && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-tinta-suave"
          onClick={() => setEditingCommission(true)}
        >
          <Percent className="h-3.5 w-3.5" />
          Comissão
        </Button>
      )}

      {currentStatus === 'active' ? (
        <Button
          size="sm"
          variant="outline"
          className="gap-1 border-red-200 text-red-600 hover:bg-red-50"
          disabled={ocupado}
          onClick={() => mudarStatus('suspended')}
        >
          <UserX className="h-3.5 w-3.5" />
          {ocupado ? '...' : 'Suspender'}
        </Button>
      ) : (
        <>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
            disabled={ocupado || (currentStatus === 'pending' && !candidaturaEnviada)}
            title={
              currentStatus === 'pending' && !candidaturaEnviada
                ? 'Ainda não enviou a candidatura'
                : undefined
            }
            onClick={() => mudarStatus('active')}
          >
            <UserCheck className="h-3.5 w-3.5" />
            {ocupado ? '...' : currentStatus === 'pending' ? 'Aprovar' : 'Reativar'}
          </Button>

          {currentStatus === 'pending' && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 border-red-200 text-red-600 hover:bg-red-50"
              disabled={ocupado}
              onClick={() => mudarStatus('rejected')}
            >
              <UserX className="h-3.5 w-3.5" />
              Recusar
            </Button>
          )}
        </>
      )}
    </div>
  )
}
