'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

/**
 * Decisão 8.5, segunda metade: o professor não cadastra produto — pede. Quem
 * responde por preço, estoque, nota e despacho é a plataforma, então o
 * cadastro em si continua sendo do admin.
 */
export function ProductRequestForm({
  teacherId,
  aulas,
}: {
  teacherId: string
  aulas: { id: string; label: string }[]
}) {
  const router = useRouter()
  const [enviando, setEnviando] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    reference_url: '',
    suggested_price: '',
    lesson_id: '',
  })

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Diga qual é o produto.')
      return
    }

    setEnviando(true)
    const supabase = createClient()
    const { error } = await supabase.from('product_requests').insert({
      teacher_id: teacherId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      reference_url: form.reference_url.trim() || null,
      suggested_price: form.suggested_price ? Number(form.suggested_price) : null,
      lesson_id: form.lesson_id || null,
    })

    if (error) {
      toast.error('Não foi possível enviar o pedido.')
    } else {
      toast.success('Pedido enviado. A equipe avalia e cadastra se fizer sentido pro catálogo.')
      setForm({ name: '', description: '', reference_url: '', suggested_price: '', lesson_id: '' })
      router.refresh()
    }
    setEnviando(false)
  }

  return (
    <Panel className="p-5">
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="pedido-nome">Produto</Label>
          <Input
            id="pedido-nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex.: Panela de ferro fundido 24 cm"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="pedido-desc">Por que ele importa na aula</Label>
          <Textarea
            id="pedido-desc"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Marca, tamanho, material — o que faz diferença no resultado."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pedido-url">Onde encontrar</Label>
            <Input
              id="pedido-url"
              type="url"
              inputMode="url"
              value={form.reference_url}
              onChange={(e) => setForm({ ...form, reference_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pedido-preco">Preço aproximado</Label>
            <Input
              id="pedido-preco"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.suggested_price}
              onChange={(e) => setForm({ ...form, suggested_price: e.target.value })}
              placeholder="0,00"
            />
          </div>
        </div>

        {aulas.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="pedido-aula">Aula em que ele apareceria</Label>
            <select
              id="pedido-aula"
              value={form.lesson_id}
              onChange={(e) => setForm({ ...form, lesson_id: e.target.value })}
              className="h-11 w-full rounded-sm border-2 border-cobalto/20 bg-white px-3 text-sm text-tinta transition-colors hover:border-cobalto/40 focus:border-cobalto focus:outline-none"
            >
              <option value="">Nenhuma em especial</option>
              {aulas.map((aula) => (
                <option key={aula.id} value={aula.id}>
                  {aula.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="text-xs leading-relaxed text-tinta-suave/70">
          Quem cadastra é a equipe da Chefio: é ela que negocia com o fornecedor, define preço e
          responde pela entrega. Você recebe a resposta nesta mesma tela.
        </p>

        <div>
          <Button type="submit" loading={enviando} loadingText="Enviando…">
            Enviar pedido
          </Button>
        </div>
      </form>
    </Panel>
  )
}
