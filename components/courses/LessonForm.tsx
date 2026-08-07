'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { lessonSchema, type LessonFormData } from '@/lib/validations/course'
import type { Lesson } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { VideoUploader } from '@/components/courses/VideoUploader'

interface LessonFormProps {
  courseId: string
  lesson?: Lesson
  orderIndex: number
  onSaved: (lesson: Lesson) => void
  onCancel: () => void
}

export function LessonForm({ courseId, lesson, orderIndex, onSaved, onCancel }: LessonFormProps) {
  const [loading, setLoading] = useState(false)
  const [savedLessonId, setSavedLessonId] = useState<string | null>(lesson?.id ?? null)
  const isEditing = !!lesson

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors } } = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema) as any,
    defaultValues: {
      title: lesson?.title ?? '',
      description: lesson?.description ?? '',
      is_free_preview: lesson?.is_free_preview ?? false,
    },
  })

  async function onSubmit(data: LessonFormData) {
    setLoading(true)
    const supabase = createClient()

    try {
      if (isEditing) {
        const { data: updated, error } = await supabase
          .from('lessons')
          .update({
            title: data.title,
            description: data.description || null,
            is_free_preview: data.is_free_preview,
          })
          .eq('id', lesson.id)
          .select()
          .single()

        if (error) throw error
        setSavedLessonId(updated.id)
        onSaved(updated)
        toast.success('Aula atualizada!')
      } else {
        const { data: created, error } = await supabase
          .from('lessons')
          .insert({
            course_id: courseId,
            title: data.title,
            description: data.description || null,
            is_free_preview: data.is_free_preview,
            order_index: orderIndex,
          })
          .select()
          .single()

        if (error) throw error
        setSavedLessonId(created.id)
        toast.success('Aula criada! Agora faça o upload do vídeo.')
        onSaved(created)
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar aula.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-brasa/30 rounded-md p-4 bg-brasa/5">
      <h3 className="font-medium text-tinta mb-4">
        {isEditing ? 'Editar aula' : 'Nova aula'}
      </h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="lesson-title">Título da aula *</Label>
          <Input id="lesson-title" placeholder="Ex: Introdução à massa folhada" {...register('title')} />
          {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="lesson-description">Descrição (opcional)</Label>
          <Textarea
            id="lesson-description"
            placeholder="O que será abordado nesta aula?"
            rows={2}
            {...register('description')}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_free_preview"
            className="h-4 w-4 rounded border-cobalto/20 text-brasa-escura focus:ring-brasa"
            {...register('is_free_preview')}
          />
          <label htmlFor="is_free_preview" className="text-sm text-tinta">
            Disponível como preview gratuito
          </label>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading} size="sm">
            {loading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar aula'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>

      {savedLessonId && (
        <div className="mt-4 pt-4 border-t border-brasa/30">
          <Label className="mb-2 block">Vídeo da aula</Label>
          <VideoUploader lessonId={savedLessonId} />
        </div>
      )}
    </div>
  )
}
