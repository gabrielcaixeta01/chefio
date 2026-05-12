import { z } from 'zod'
import { COURSE_CATEGORIES } from '@/lib/utils'

export const courseSchema = z.object({
  title: z.string().min(5, 'Título deve ter pelo menos 5 caracteres').max(120),
  description: z.string().min(20, 'Descrição deve ter pelo menos 20 caracteres').max(2000).optional().or(z.literal('')),
  category: z.enum(COURSE_CATEGORIES as unknown as [string, ...string[]]).optional().or(z.literal('')),
  price: z.coerce.number().min(0, 'Preço não pode ser negativo').max(9999),
})

export const lessonSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres').max(120),
  description: z.string().max(1000).optional().or(z.literal('')),
  is_free_preview: z.boolean().default(false),
})

export type CourseFormData = z.infer<typeof courseSchema>
export type LessonFormData = z.infer<typeof lessonSchema>
