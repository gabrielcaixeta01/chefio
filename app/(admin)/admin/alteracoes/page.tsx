import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel, SectionHeading } from '@/components/ui/panel'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { LessonChangeActions } from '@/components/admin/LessonChangeActions'
import { FileEdit } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Alterações de aula' }

const ROTULO = {
  remove: 'Remover aula',
  replace_video: 'Trocar vídeo',
} as const

/**
 * Fila da decisão 3.4. Só chega aqui mudança em curso que já tem aluno
 * matriculado — curso sem venda o professor edita à vontade, sem passar por
 * ninguém.
 */
export default async function AdminLessonChangesPage() {
  const supabase = await createClient()

  const select = '*, course:courses(title), teacher:profiles(name)'

  const [{ data: pendentes }, { data: resolvidos }] = await Promise.all([
    supabase
      .from('lesson_change_requests')
      .select(select)
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('lesson_change_requests')
      .select(select)
      .in('status', ['approved', 'rejected'])
      .order('reviewed_at', { ascending: false })
      .limit(30),
  ])

  return (
    <>
      <PageHeader
        olho="Administração"
        titulo="Alterações de aula"
        descricao={
          pendentes && pendentes.length > 0
            ? `${pendentes.length} ${pendentes.length === 1 ? 'pedido aguardando' : 'pedidos aguardando'} decisão`
            : 'Nenhum pedido aguardando decisão'
        }
      />

      <PageBody>
        {!pendentes || pendentes.length === 0 ? (
          <EmptyState
            icon={FileEdit}
            titulo="Nada na fila"
            descricao="Professores só precisam de aval para mexer em aula de curso que já foi vendido — tirar a aula do ar ou trocar o vídeo que o aluno já assistiu."
          />
        ) : (
          <Panel className="overflow-hidden">
            <SectionHeading titulo="Aguardando decisão" className="border-b border-cobalto/10 px-4 py-3" />
            <ul className="divide-y divide-cobalto/10">
              {pendentes.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                  <div className="min-w-0 flex-1 basis-64">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-tinta">
                      <span className="truncate">{p.lesson_title}</span>
                      <Badge variant={p.type === 'remove' ? 'destructive' : 'info'}>
                        {ROTULO[p.type]}
                      </Badge>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-tinta-suave/70">
                      {(p.course as any)?.title ?? '—'} · {(p.teacher as any)?.name ?? '—'} ·{' '}
                      {new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    {p.reason && (
                      <p className="mt-1.5 text-xs italic text-tinta-suave">“{p.reason}”</p>
                    )}
                  </div>
                  <LessonChangeActions requestId={p.id} tipo={p.type} />
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {resolvidos && resolvidos.length > 0 && (
          <Panel className="mt-6 overflow-hidden">
            <SectionHeading titulo="Histórico" className="border-b border-cobalto/10 px-4 py-3" />
            <ul className="divide-y divide-cobalto/10">
              {resolvidos.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate text-sm text-tinta">{p.lesson_title}</p>
                    <p className="mt-0.5 truncate text-xs text-tinta-suave/70">
                      {(p.course as any)?.title ?? '—'} · {ROTULO[p.type]} ·{' '}
                      {p.reviewed_at ? new Date(p.reviewed_at).toLocaleDateString('pt-BR') : '—'}
                    </p>
                  </div>
                  <Badge variant={p.status === 'approved' ? 'success' : 'neutral'}>
                    {p.status === 'approved' ? 'Aprovado' : 'Recusado'}
                  </Badge>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </PageBody>
    </>
  )
}
