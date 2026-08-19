'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { Panel } from '@/components/ui/panel'
import { Label } from '@/components/ui/label'
import { Package } from 'lucide-react'

type Aula = { id: string; title: string }
type Curso = { id: string; title: string; lessons: Aula[] }
type Produto = { id: string; name: string; price: number; image_url: string | null; stock: number }
type Vinculo = { lesson_id: string; product_id: string }

/**
 * Decisão 8.5. A policy `lesson_products_teacher_manage` (00002) já deixava o
 * professor fazer isso desde sempre — o que não existia era tela, então na
 * prática só o admin conseguia montar a prateleira de uma aula.
 */
export function LessonProductPicker({
  cursos,
  produtos,
  vinculos,
}: {
  cursos: Curso[]
  produtos: Produto[]
  vinculos: Vinculo[]
}) {
  const router = useRouter()
  const [cursoId, setCursoId] = useState(cursos[0]?.id ?? '')
  const curso = cursos.find((c) => c.id === cursoId) ?? cursos[0]
  const [aulaId, setAulaId] = useState(curso?.lessons[0]?.id ?? '')
  const [salvando, setSalvando] = useState<string | null>(null)

  // Estado local pra caixa marcar na hora: o round-trip até o banco deixava
  // um atraso visível em cada clique numa lista de vinte produtos.
  const [marcados, setMarcados] = useState<Set<string>>(
    () => new Set(vinculos.map((v) => `${v.lesson_id}:${v.product_id}`))
  )

  const aulasDoCurso = useMemo(() => curso?.lessons ?? [], [curso])
  const aulaSelecionada = aulasDoCurso.find((l) => l.id === aulaId) ?? aulasDoCurso[0]

  function trocarCurso(novoCursoId: string) {
    setCursoId(novoCursoId)
    const primeiro = cursos.find((c) => c.id === novoCursoId)?.lessons[0]
    setAulaId(primeiro?.id ?? '')
  }

  async function alternar(produtoId: string, marcar: boolean) {
    if (!aulaSelecionada) return
    const chave = `${aulaSelecionada.id}:${produtoId}`

    setSalvando(produtoId)
    setMarcados((prev) => {
      const proximo = new Set(prev)
      if (marcar) proximo.add(chave)
      else proximo.delete(chave)
      return proximo
    })

    const supabase = createClient()
    const { error } = marcar
      ? await supabase
          .from('lesson_products')
          .insert({ lesson_id: aulaSelecionada.id, product_id: produtoId })
      : await supabase
          .from('lesson_products')
          .delete()
          .eq('lesson_id', aulaSelecionada.id)
          .eq('product_id', produtoId)

    if (error) {
      // Desfaz o otimismo: deixar a caixa marcada mentiria sobre o que o
      // aluno vai ver na aula.
      setMarcados((prev) => {
        const proximo = new Set(prev)
        if (marcar) proximo.delete(chave)
        else proximo.add(chave)
        return proximo
      })
      toast.error('Não foi possível salvar. Tente de novo.')
    } else {
      router.refresh()
    }
    setSalvando(null)
  }

  if (!curso || !aulaSelecionada) return null

  return (
    <Panel className="p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="picker-curso">Curso</Label>
          <select
            id="picker-curso"
            value={cursoId}
            onChange={(e) => trocarCurso(e.target.value)}
            className="h-11 w-full rounded-sm border-2 border-cobalto/20 bg-white px-3 text-sm text-tinta transition-colors hover:border-cobalto/40 focus:border-cobalto focus:outline-none"
          >
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="picker-aula">Aula</Label>
          <select
            id="picker-aula"
            value={aulaSelecionada.id}
            onChange={(e) => setAulaId(e.target.value)}
            className="h-11 w-full rounded-sm border-2 border-cobalto/20 bg-white px-3 text-sm text-tinta transition-colors hover:border-cobalto/40 focus:border-cobalto focus:outline-none"
          >
            {aulasDoCurso.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {produtos.length === 0 ? (
        <p className="mt-5 text-sm text-tinta-suave">
          Nenhum produto ativo no catálogo ainda. Use o formulário abaixo para pedir o cadastro do
          que você usa na aula.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-cobalto/10 border-t border-cobalto/10">
          {produtos.map((produto) => {
            const chave = `${aulaSelecionada.id}:${produto.id}`
            const marcado = marcados.has(chave)
            return (
              <li key={produto.id}>
                <label className="flex cursor-pointer items-center gap-3 py-3">
                  <input
                    type="checkbox"
                    checked={marcado}
                    disabled={salvando === produto.id}
                    onChange={(e) => alternar(produto.id, e.target.checked)}
                    className="h-5 w-5 shrink-0 accent-cobalto"
                  />
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-cobalto/10">
                    {produto.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL arbitrária cadastrada pelo admin
                      <img src={produto.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-4 w-4 text-cobalto/25" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-tinta">
                      {produto.name}
                    </span>
                    <span className="block text-xs tabular-nums text-tinta-suave/70">
                      {formatCurrency(produto.price)}
                      {produto.stock <= 0 ? ' · sem estoque' : ''}
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
