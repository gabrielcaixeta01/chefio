import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createPublicClient } from '@/lib/supabase/public'
import { Badge } from '@/components/ui/badge'
import { PurchaseBox } from '@/components/curso/PurchaseBox'
import { formatCurrency, formatDuration } from '@/lib/utils'
import { Lock, Play, Clock, ChefHat, BookOpen } from 'lucide-react'

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = createPublicClient()
  const { data: course } = await supabase
    .from('courses')
    .select('title, description')
    .eq('slug', slug)
    .single()
  return { title: course?.title ?? 'Curso', description: course?.description ?? '' }
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createPublicClient()

  const { data: course } = await supabase
    .from('courses')
    .select(`
      *,
      teacher:profiles(id, name, avatar_url),
      lessons(id, title, duration_seconds, is_free_preview, order_index)
    `)
    .eq('slug', slug)
    .eq('status', 'approved')
    .single()

  if (!course) notFound()

  // View pública (só user_id + bio) — o resto de teacher_profiles, como
  // stripe_account_id, não deve vazar pro catálogo (00003_security_fixes.sql).
  const { data: teacherPublic } = await supabase
    .from('teacher_profiles_public')
    .select('bio')
    .eq('user_id', course.teacher_id)
    .maybeSingle()

  const lessons = (course.lessons as any[]).sort((a, b) => a.order_index - b.order_index)
  const totalDuration = lessons.reduce((sum: number, l: any) => sum + (l.duration_seconds ?? 0), 0)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Coluna principal */}
        <div className="lg:col-span-2">
          {/* Thumbnail */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 mb-6">
            {course.thumbnail_url ? (
              <Image src={course.thumbnail_url} alt={course.title} fill className="object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <ChefHat className="h-16 w-16 text-gray-300" />
              </div>
            )}
          </div>

          {course.category && (
            <Badge variant="secondary" className="mb-3">{course.category}</Badge>
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{course.title}</h1>

          <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
            <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" />{lessons.length} aulas</span>
            {totalDuration > 0 && (
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{formatDuration(totalDuration)}</span>
            )}
          </div>

          {/* Descrição */}
          {course.description && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Sobre o curso</h2>
              <p className="text-gray-600 leading-relaxed">{course.description}</p>
            </div>
          )}

          {/* Professor */}
          <div className="flex items-start gap-3 mb-8 p-4 bg-gray-50 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <ChefHat className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Instrutor</p>
              <p className="font-semibold text-gray-900">{(course.teacher as any)?.name}</p>
              {teacherPublic?.bio && (
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{teacherPublic.bio}</p>
              )}
            </div>
          </div>

          {/* Lista de aulas */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Conteúdo do curso</h2>
            <div className="space-y-2">
              {lessons.map((lesson: any, index: number) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white"
                >
                  <div className="flex items-center gap-3">
                    {lesson.is_free_preview ? (
                      <Play className="h-4 w-4 text-orange-500 shrink-0" />
                    ) : (
                      <Lock className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                    <span className="text-sm text-gray-700">
                      {index + 1}. {lesson.title}
                      {lesson.is_free_preview && (
                        <span className="ml-2 text-xs text-orange-600 font-medium">Prévia grátis</span>
                      )}
                    </span>
                  </div>
                  {lesson.duration_seconds && (
                    <span className="text-xs text-gray-400 shrink-0">{formatDuration(lesson.duration_seconds)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar de compra */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {course.price === 0 ? 'Grátis' : formatCurrency(course.price)}
            </p>

            <Suspense
              fallback={<div className="mt-4 h-12 w-full rounded-md bg-gray-100 animate-pulse" aria-hidden="true" />}
            >
              <PurchaseBox courseId={course.id} courseSlug={course.slug} price={course.price} />
            </Suspense>

            <ul className="mt-6 space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-gray-400" />
                {lessons.length} aulas em vídeo
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                Acesso vitalício
              </li>
              <li className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-gray-400" />
                Produtos recomendados por aula
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
