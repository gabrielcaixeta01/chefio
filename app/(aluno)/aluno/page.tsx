import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { BookOpen, PlayCircle } from 'lucide-react'

export default async function AlunoDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, course:courses(id, title, slug, thumbnail_url, teacher_id, teacher:profiles(name))')
    .eq('student_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minha área</h1>
          <p className="text-gray-500 mt-1">Continue de onde parou</p>
        </div>
        <Link href="/cursos">
          <Button variant="outline">Explorar mais cursos</Button>
        </Link>
      </div>

      {!enrollments || enrollments.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Você ainda não tem cursos</h2>
          <p className="text-gray-500 text-sm mb-6">Explore nossa biblioteca e comece sua jornada culinária!</p>
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
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
              >
                <div className="relative aspect-video bg-gray-100">
                  {course?.thumbnail_url ? (
                    <Image
                      src={course.thumbnail_url}
                      alt={course.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <PlayCircle className="h-12 w-12 text-white" />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{course?.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
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
