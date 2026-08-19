'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const productSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(120),
  description: z.string().max(500).optional().or(z.literal('')),
  price: z.coerce.number().min(0).max(99999),
  // Sem este campo o produto nascia com stock=0 (default da tabela) e o
  // checkout reprovava com "Estoque insuficiente" — a loja não vendia nada.
  stock: z.coerce.number().int('Use um número inteiro').min(0).max(99999),
  image_url: z.string().url('Informe uma URL válida').optional().or(z.literal('')),
})

type ProductFormData = z.infer<typeof productSchema>

/** Pedido de cadastro feito por um professor (decisão 8.5), quando houver. */
export interface PedidoDeProduto {
  id: string
  name: string
  description: string | null
  reference_url: string | null
  suggested_price: number | null
  teacherName?: string | null
}

export function ProductForm({ pedido }: { pedido?: PedidoDeProduto | null }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: pedido
      ? {
          name: pedido.name,
          description: pedido.description ?? '',
          price: pedido.suggested_price ?? 0,
          stock: 0,
          image_url: '',
        }
      : { name: '', description: '', price: 0, stock: 0, image_url: '' },
  })

  async function onSubmit(data: ProductFormData) {
    setLoading(true)
    const supabase = createClient()
    const { data: criado, error } = await supabase
      .from('products')
      .insert({
        name: data.name,
        description: data.description || null,
        price: data.price,
        stock: data.stock,
        image_url: data.image_url || null,
        is_active: true,
      })
      .select('id')
      .single()

    if (error) {
      toast.error(error.message ?? 'Erro ao criar produto.')
      setLoading(false)
      return
    }

    // Cadastrar a partir de um pedido fecha o pedido junto (8.5): sem isso o
    // professor ficaria vendo "Em análise" com o produto já na prateleira.
    if (pedido && criado?.id) {
      const { error: pedidoError } = await supabase
        .from('product_requests')
        .update({ status: 'approved', product_id: criado.id })
        .eq('id', pedido.id)
      if (pedidoError) toast.error('Produto criado, mas o pedido do professor não foi baixado.')
    }

    toast.success(pedido ? 'Produto criado e pedido atendido!' : 'Produto criado!')
    reset()
    router.refresh()
    if (pedido) router.push('/admin/produtos')
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-md border border-cobalto/15 p-5">
      <h2 className="font-display font-bold text-tinta mb-4 tracking-tight">
        {pedido ? 'Cadastrar produto pedido' : 'Novo produto'}
      </h2>
      {pedido && (
        <p className="-mt-2 mb-4 text-xs leading-relaxed text-tinta-suave">
          Pedido de {pedido.teacherName ?? 'um professor'}.
          {pedido.reference_url && (
            <>
              {' '}
              <a
                href={pedido.reference_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-cobalto underline-offset-4 hover:underline"
              >
                Ver referência
              </a>
              .
            </>
          )}{' '}
          Salvar aqui cadastra o produto e baixa o pedido.
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name">Nome *</Label>
          <Input id="name" placeholder="Ex: Forma de silicone antiaderente" {...register('name')} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" rows={3} placeholder="Descreva o produto..." {...register('description')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="price">Preço (R$) *</Label>
            <Input id="price" type="number" min="0" step="0.01" placeholder="0,00" {...register('price')} />
            {errors.price && <p className="text-xs text-red-600">{errors.price.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="stock">Estoque *</Label>
            <Input id="stock" type="number" min="0" step="1" placeholder="0" {...register('stock')} />
            {errors.stock && <p className="text-xs text-red-600">{errors.stock.message}</p>}
            <p className="text-xs text-tinta-suave/70">Com 0 o produto não pode ser comprado.</p>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="image_url">URL da imagem</Label>
          <Input id="image_url" type="url" placeholder="https://..." {...register('image_url')} />
          {errors.image_url && <p className="text-xs text-red-600">{errors.image_url.message}</p>}
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Salvando...' : 'Criar produto'}
        </Button>
      </form>
    </div>
  )
}
