import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser } from '@/lib/auth/session'
import { COMISSAO_PRODUTO_PROFESSOR } from '@/lib/utils'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel, SectionHeading } from '@/components/ui/panel'
import { Notice } from '@/components/ui/notice'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { LessonProductPicker } from '@/components/courses/LessonProductPicker'
import { ProductRequestForm } from '@/components/courses/ProductRequestForm'
import { Package } from 'lucide-react'

export const metadata: Metadata = { title: 'Produtos das aulas' }

const ROTULO_PEDIDO = {
  pending: 'Em análise',
  approved: 'Cadastrado',
  rejected: 'Recusado',
} as const

/**
 * Decisão 8.5: o professor escolhe entre os produtos já cadastrados quais
 * aparecem em cada aula, e pede o cadastro de um produto externo quando o que
 * ele usa não está na prateleira. Cadastrar direto continua sendo só do admin
 * — quem responde por estoque, preço e despacho é a plataforma.
 *
 * Decisão 8.4: vincular aqui é o que faz a comissão existir. O mesmo produto
 * comprado pela aba Loja não gera repasse.
 */
export default async function ProfessorProdutosPage() {
  const user = await getAuthedUser()
  const supabase = await createClient()

  const { data: cursos } = await supabase
    .from('courses')
    .select('id, title, lessons(id, title, order_index)')
    .eq('teacher_id', user!.id)
    .order('created_at', { ascending: false })

  const lessonIds = (cursos ?? []).flatMap((c) => ((c.lessons as any[]) ?? []).map((l) => l.id))

  const [{ data: produtos }, { data: vinculos }, { data: pedidos }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, price, image_url, stock')
      .eq('is_active', true)
      .order('name'),
    lessonIds.length > 0
      ? supabase.from('lesson_products').select('lesson_id, product_id').in('lesson_id', lessonIds)
      : Promise.resolve({ data: [] as { lesson_id: string; product_id: string }[] }),
    supabase
      .from('product_requests')
      .select('*')
      .eq('teacher_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const cursosComAulas = (cursos ?? [])
    .map((c) => ({
      id: c.id,
      title: c.title,
      lessons: (((c.lessons as any[]) ?? []) as { id: string; title: string; order_index: number }[])
        .slice()
        .sort((a, b) => a.order_index - b.order_index),
    }))
    .filter((c) => c.lessons.length > 0)

  return (
    <>
      <PageHeader
        olho="Loja"
        titulo="Produtos das aulas"
        descricao="Escolha o que aparece na bancada junto com cada aula sua."
      />

      <PageBody className="max-w-3xl">
        <Notice tipo="info" className="mb-6" titulo={`Você ganha ${COMISSAO_PRODUTO_PROFESSOR}% desses produtos`}>
          A comissão vale quando o aluno compra pela página da sua aula. O mesmo produto comprado
          pela aba Loja é uma venda da plataforma, sem repasse. Estoque, preço e entrega continuam
          sendo por conta da Chefio.
        </Notice>

        <section className="mb-10">
          <SectionHeading titulo="Vincular produtos às aulas" className="mb-4" />
          {cursosComAulas.length === 0 ? (
            <EmptyState
              icon={Package}
              titulo="Nenhuma aula ainda"
              descricao="Crie um curso com pelo menos uma aula para poder indicar produtos."
            />
          ) : (
            <LessonProductPicker
              cursos={cursosComAulas}
              produtos={produtos ?? []}
              vinculos={vinculos ?? []}
            />
          )}
        </section>

        <section className="mb-10">
          <SectionHeading titulo="Pedir um produto novo" className="mb-4" />
          <ProductRequestForm
            teacherId={user!.id}
            aulas={cursosComAulas.flatMap((c) =>
              c.lessons.map((l) => ({ id: l.id, label: `${c.title} — ${l.title}` }))
            )}
          />
        </section>

        {pedidos && pedidos.length > 0 && (
          <section>
            <SectionHeading titulo="Seus pedidos de cadastro" className="mb-4" />
            <Panel className="overflow-hidden">
              <ul className="divide-y divide-cobalto/10">
                {pedidos.map((pedido) => (
                  <li key={pedido.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="truncate text-sm font-medium text-tinta">{pedido.name}</p>
                      <p className="mt-0.5 text-xs text-tinta-suave/70">
                        {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                      </p>
                      {pedido.review_note && (
                        <p className="mt-1.5 text-xs italic text-tinta-suave">“{pedido.review_note}”</p>
                      )}
                    </div>
                    <Badge
                      variant={
                        pedido.status === 'approved'
                          ? 'success'
                          : pedido.status === 'rejected'
                            ? 'neutral'
                            : 'warning'
                      }
                    >
                      {ROTULO_PEDIDO[pedido.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Panel>
          </section>
        )}
      </PageBody>
    </>
  )
}
