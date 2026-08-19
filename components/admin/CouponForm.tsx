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
import { COMISSAO_PADRAO } from '@/lib/utils'

const couponSchema = z.object({
  code: z
    .string()
    .min(3, 'Mínimo de 3 caracteres')
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, 'Use só letras, números, hífen e underline'),
  // O teto é a comissão: quem banca o desconto é a plataforma (decisão 2.6),
  // então acima disso cada venda sairia com prejuízo — o checkout recusaria.
  discount_percent: z.coerce
    .number()
    .int('Use um número inteiro')
    .min(1)
    .max(COMISSAO_PADRAO, `Máximo de ${COMISSAO_PADRAO}% — acima disso a venda dá prejuízo`),
  course_id: z.string().optional().or(z.literal('')),
  max_redemptions: z.coerce.number().int().min(1).optional().or(z.literal('')),
  expires_at: z.string().optional().or(z.literal('')),
})

type CouponFormData = z.infer<typeof couponSchema>

export function CouponForm({ cursos }: { cursos: { id: string; title: string }[] }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CouponFormData>({
    resolver: zodResolver(couponSchema) as any,
    defaultValues: { code: '', discount_percent: 10, course_id: '', max_redemptions: '', expires_at: '' },
  })

  async function onSubmit(data: CouponFormData) {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('coupons').insert({
      code: data.code.trim().toUpperCase(),
      discount_percent: data.discount_percent,
      course_id: data.course_id || null,
      max_redemptions: data.max_redemptions ? Number(data.max_redemptions) : null,
      expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
      created_by: user?.id ?? null,
    })

    if (error) {
      toast.error(error.code === '23505' ? 'Já existe um cupom com esse código.' : 'Erro ao criar cupom.')
    } else {
      toast.success('Cupom criado.')
      reset()
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="rounded-md border border-cobalto/15 bg-white p-5">
      <h2 className="mb-1 font-display font-bold tracking-tight text-tinta">Novo cupom</h2>
      <p className="mb-4 text-xs text-tinta-suave">
        O desconto sai da comissão da Chefio — o professor continua recebendo sobre o preço cheio.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="code">Código *</Label>
          <Input id="code" placeholder="Ex.: CHEFIO10" className="uppercase" {...register('code')} />
          {errors.code && <p className="text-xs text-red-600">{errors.code.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="discount_percent">Desconto (%) *</Label>
          <Input id="discount_percent" type="number" min={1} max={COMISSAO_PADRAO} {...register('discount_percent')} />
          {errors.discount_percent && (
            <p className="text-xs text-red-600">{errors.discount_percent.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="course_id">Curso</Label>
          <select
            id="course_id"
            className="flex h-11 w-full rounded-sm border-2 border-cobalto/20 bg-white px-3.5 text-sm text-tinta focus:border-cobalto focus:outline-none"
            {...register('course_id')}
          >
            <option value="">Todos os cursos</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="max_redemptions">Limite de usos</Label>
            <Input id="max_redemptions" type="number" min={1} placeholder="Ilimitado" {...register('max_redemptions')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="expires_at">Validade</Label>
            <Input id="expires_at" type="date" {...register('expires_at')} />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Criando...' : 'Criar cupom'}
        </Button>
      </form>
    </div>
  )
}
