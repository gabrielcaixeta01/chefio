'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { EyeOff, Eye } from 'lucide-react'

/**
 * Tirar do catálogo é o que substitui "excluir curso" (decisão 3.3): o curso
 * some da vitrine e para de vender, e quem já comprou continua assistindo
 * para sempre (3.1). Apagar de verdade o banco recusa, porque levaria junto
 * aula, progresso e caderno de todos os alunos.
 */
export function CourseArchiveToggle({
  courseId,
  arquivado,
  temAlunos,
}: {
  courseId: string
  arquivado: boolean
  temAlunos: boolean
}) {
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()

  async function alternar() {
    if (
      !arquivado &&
      !confirm(
        temAlunos
          ? 'Tirar do catálogo? O curso para de aparecer e de vender. Quem já comprou continua com acesso normal.'
          : 'Tirar do catálogo? O curso para de aparecer na vitrine e de vender.'
      )
    ) {
      return
    }

    setCarregando(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('courses')
      .update({ archived_at: arquivado ? null : new Date().toISOString() })
      .eq('id', courseId)

    if (error) {
      toast.error('Não foi possível atualizar o curso.')
    } else {
      toast.success(arquivado ? 'Curso de volta ao catálogo.' : 'Curso fora do catálogo.')
      router.refresh()
    }
    setCarregando(false)
  }

  return (
    <Button variant="outline" size="sm" disabled={carregando} onClick={alternar} className="gap-1.5">
      {arquivado ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      {carregando ? '...' : arquivado ? 'Voltar ao catálogo' : 'Tirar do catálogo'}
    </Button>
  )
}
