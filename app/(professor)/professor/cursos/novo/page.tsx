import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { CourseForm } from '@/components/courses/CourseForm'

export const metadata: Metadata = { title: 'Novo Curso' }

export default async function NewCoursePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Novo Curso</h1>
      <p className="text-gray-500 mb-8">Preencha as informações básicas do seu curso.</p>
      <CourseForm teacherId={user!.id} />
    </div>
  )
}
