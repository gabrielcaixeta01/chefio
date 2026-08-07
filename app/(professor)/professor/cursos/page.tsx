import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Plus, BookOpen } from 'lucide-react'

export const metadata: Metadata = { title: 'Meus Cursos' }

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-cobalto/10 text-tinta-suave' },
  pending_review: { label: 'Em revisão', className: 'bg-amber-50 text-amber-800' },
  approved: { label: 'Publicado', className: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Rejeitado', className: 'bg-red-50 text-red-700' },
}

export default async function ProfessorCoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, slug, status, price, category, thumbnail_url, created_at')
    .eq('teacher_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tinta">Meus Cursos</h1>
          <p className="text-tinta-suave mt-1">{courses?.length ?? 0} curso(s) criado(s)</p>
        </div>
        <Link href="/professor/cursos/novo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo curso
          </Button>
        </Link>
      </div>

      {!courses || courses.length === 0 ? (
        <div className="bg-white rounded-md border border-dashed border-cobalto/20 p-16 text-center">
          <BookOpen className="h-12 w-12 text-cobalto/25 mx-auto mb-4" />
          <h3 className="font-semibold text-tinta mb-2">Nenhum curso ainda</h3>
          <p className="text-tinta-suave/70 text-sm mb-6">Crie seu primeiro curso e comece a ensinar!</p>
          <Link href="/professor/cursos/novo">
            <Button>Criar primeiro curso</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-md border border-cobalto/15 divide-y divide-cobalto/10">
          {courses.map((course) => {
            const status = STATUS_LABELS[course.status ?? 'draft'] ?? STATUS_LABELS.draft
            return (
              <div key={course.id} className="flex items-center gap-4 p-4 hover:bg-cal-fundo transition-colors">
                <div className="w-24 h-14 rounded-sm bg-cobalto/10 shrink-0 overflow-hidden">
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-cobalto/25" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-tinta truncate">{course.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {course.category && (
                      <span className="text-xs text-tinta-suave/70">{course.category}</span>
                    )}
                    {course.category && <span className="text-cobalto/15">·</span>}
                    <span className="text-xs font-medium text-brasa-escura">
                      {course.price === 0 ? 'Grátis' : formatCurrency(course.price)}
                    </span>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${status.className}`}>
                  {status.label}
                </span>
                <Link href={`/professor/cursos/${course.id}`}>
                  <Button variant="outline" size="sm">Gerenciar</Button>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
