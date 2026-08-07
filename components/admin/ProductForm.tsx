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
})

type ProductFormData = z.infer<typeof productSchema>

export function ProductForm() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: { name: '', description: '', price: 0 },
  })

  async function onSubmit(data: ProductFormData) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('products').insert({
      name: data.name,
      description: data.description || null,
      price: data.price,
      is_active: true,
    })

    if (error) {
      toast.error(error.message ?? 'Erro ao criar produto.')
    } else {
      toast.success('Produto criado!')
      reset()
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-md border border-cobalto/15 p-5">
      <h2 className="font-display font-bold text-tinta mb-4 tracking-tight">Novo produto</h2>
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

        <div className="space-y-1">
          <Label htmlFor="price">Preço (R$) *</Label>
          <Input id="price" type="number" min="0" step="0.01" placeholder="0,00" {...register('price')} />
          {errors.price && <p className="text-xs text-red-600">{errors.price.message}</p>}
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Salvando...' : 'Criar produto'}
        </Button>
      </form>
    </div>
  )
}
