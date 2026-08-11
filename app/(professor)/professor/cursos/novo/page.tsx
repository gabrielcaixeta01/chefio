import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { CourseForm } from '@/components/courses/CourseForm'
import { PageHeader, PageBody } from '@/components/layout/PageShell'

export const metadata: Metadata = { title: 'Novo Curso' }

export default async function NewCoursePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <>
      <PageHeader
        olho="Novo curso"
        titulo="Comece pelo essencial"
        descricao="Título, categoria e preço já bastam pra criar o curso. As aulas você adiciona depois, uma a uma."
      />

      <PageBody className="max-w-3xl">
        <CourseForm teacherId={user!.id} />
      </PageBody>
    </>
  )
}
