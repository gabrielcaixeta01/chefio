'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { courseSchema, type CourseFormData } from '@/lib/validations/course'
import { slugify, COURSE_CATEGORIES, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Course } from '@/types/database'

interface CourseFormProps {
  course?: Course
  teacherId: string
}

export function CourseForm({ course, teacherId }: CourseFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(course?.thumbnail_url ?? null)
  const isEditing = !!course

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors } } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema) as any,
    defaultValues: {
      title: course?.title ?? '',
      description: course?.description ?? '',
      category: (course?.category as any) ?? '',
      price: course?.price ?? 0,
    },
  })

  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setThumbnailFile(file)
    setThumbnailPreview(URL.createObjectURL(file))
  }

  async function onSubmit(data: CourseFormData) {
    setLoading(true)
    const supabase = createClient()

    try {
      let thumbnailUrl = course?.thumbnail_url ?? null

      // Upload thumbnail se houver novo arquivo
      if (thumbnailFile) {
        const ext = thumbnailFile.name.split('.').pop()
        const path = `${teacherId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('thumbnails')
          .upload(path, thumbnailFile, { upsert: true })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage.from('thumbnails').getPublicUrl(path)
        thumbnailUrl = publicUrl
      }

      if (isEditing) {
        const { error } = await supabase
          .from('courses')
          .update({
            title: data.title,
            description: data.description || null,
            category: data.category || null,
            price: data.price,
            thumbnail_url: thumbnailUrl,
          })
          .eq('id', course.id)

        if (error) throw error
        toast.success('Curso atualizado!')
        router.refresh()
      } else {
        // Gera slug único
        let slug = slugify(data.title)
        const { data: existing } = await supabase
          .from('courses')
          .select('slug')
          .like('slug', `${slug}%`)
        if (existing && existing.length > 0) slug = `${slug}-${existing.length + 1}`

        const { data: newCourse, error } = await supabase
          .from('courses')
          .insert({
            teacher_id: teacherId,
            title: data.title,
            slug,
            description: data.description || null,
            category: data.category || null,
            price: data.price,
            thumbnail_url: thumbnailUrl,
            status: 'draft',
          })
          .select()
          .single()

        if (error) throw error
        toast.success('Curso criado!')
        router.push(`/professor/cursos/${newCourse.id}`)
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar curso.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Thumbnail */}
      <div className="space-y-2">
        <Label>Capa do curso</Label>
        <div className="flex items-start gap-4">
          <div className="w-40 h-24 rounded-sm border-2 border-dashed border-cobalto/15 bg-cal-fundo flex items-center justify-center overflow-hidden shrink-0">
            {thumbnailPreview ? (
              <img src={thumbnailPreview} alt="Capa" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-tinta-suave/70 text-center px-2">Sem imagem</span>
            )}
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              id="thumbnail"
              className="hidden"
              onChange={handleThumbnailChange}
            />
            <label
              htmlFor="thumbnail"
              className="cursor-pointer inline-flex items-center px-3 py-2 border border-cobalto/20 rounded-md text-sm text-tinta bg-white hover:bg-cal-fundo"
            >
              Escolher imagem
            </label>
            <p className="text-xs text-tinta-suave/70 mt-1">JPG, PNG ou WebP. Proporção 16:9 recomendada.</p>
          </div>
        </div>
      </div>

      {/* Título */}
      <div className="space-y-1">
        <Label htmlFor="title">Título do curso *</Label>
        <Input id="title" placeholder="Ex: Confeitaria Francesa do Zero" {...register('title')} />
        {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
      </div>

      {/* Descrição */}
      <div className="space-y-1">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          placeholder="Descreva o que o aluno vai aprender neste curso..."
          rows={4}
          {...register('description')}
        />
        {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
      </div>

      {/* Categoria e Preço */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="category">Categoria</Label>
          <select
            id="category"
            className="flex h-11 w-full rounded-sm border-2 border-cobalto/20 bg-white px-3.5 text-sm text-tinta transition-colors hover:border-cobalto/40 focus:border-cobalto focus:outline-none"
            {...register('category')}
          >
            <option value="">Selecione...</option>
            {COURSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="price">Preço (R$)</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            {...register('price')}
          />
          {errors.price && <p className="text-xs text-red-600">{errors.price.message}</p>}
          <p className="text-xs text-tinta-suave/70">Use 0 para curso gratuito</p>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar curso'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
