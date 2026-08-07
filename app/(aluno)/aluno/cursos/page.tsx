import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { BookOpen, PlayCircle, ChefHat } from 'lucide-react'

export default async function AlunoCoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: enrollments }, { data: pendingTeacherProfile }] = await Promise.all([
    supabase
      .from('enrollments')
      .select('*, course:courses(id, title, slug, thumbnail_url, teacher_id, teacher:profiles(name))')
      .eq('student_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('teacher_profiles')
      .select('status')
      .eq('user_id', user!.id)
      .eq('status', 'pending')
      .maybeSingle(),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tinta">Meus cursos</h1>
          <p className="text-tinta-suave mt-1">Seus cursos comprados e em andamento</p>
        </div>
        <Link href="/cursos">
          <Button variant="outline">Explorar mais cursos</Button>
        </Link>
      </div>

      {pendingTeacherProfile && (
        <div className="flex items-start gap-3 mb-8 p-4 bg-amber-50 border border-amber-200 rounded-md">
          <ChefHat className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 text-sm font-medium">Seu cadastro como professor está em análise</p>
            <p className="text-amber-700 text-xs mt-1">
              Assim que for aprovado, você ganha acesso à área do professor pra publicar cursos e configurar recebimentos. Enquanto isso, pode usar a plataforma normalmente como aluno.
            </p>
          </div>
        </div>
      )}

      {!enrollments || enrollments.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-md border border-cobalto/15">
          <BookOpen className="h-12 w-12 text-cobalto/25 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-tinta mb-2">Você ainda não tem cursos</h2>
          <p className="text-tinta-suave text-sm mb-6">Explore nossa biblioteca e comece sua jornada culinária!</p>
          <Link href="/cursos">
            <Button>Ver cursos disponíveis</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((enrollment) => {
            const course = enrollment.course as any
            return (
              <Link
                key={enrollment.id}
                href={`/aluno/cursos/${course?.slug}`}
                className="bg-white rounded-md border border-cobalto/15 overflow-hidden hover:shadow-md transition-shadow group"
              >
                <div className="relative aspect-video bg-cobalto/10">
                  {course?.thumbnail_url ? (
                    <Image
                      src={course.thumbnail_url}
                      alt={course.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="h-10 w-10 text-cobalto/25" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <PlayCircle className="h-12 w-12 text-white" />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-tinta text-sm line-clamp-2">{course?.title}</h3>
                  <p className="text-xs text-tinta-suave mt-1">
                    por {(course?.teacher as any)?.name ?? 'Professor'}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
