import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, COURSE_CATEGORIES } from '@/lib/utils'
import { ChefHat } from 'lucide-react'

export const metadata: Metadata = { title: 'Explorar Cursos' }

export default async function CourseCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>
}) {
  const { category, q } = await searchParams
  let courses: any[] = []
  try {
    const supabase = await createClient()
    let query = supabase
      .from('courses')
      .select('id, title, slug, thumbnail_url, price, category, teacher:profiles(name)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    if (category) query = query.eq('category', category)
    if (q) query = query.ilike('title', `%${q}%`)
    const { data } = await query
    courses = data ?? []
  } catch {
    // Supabase não configurado
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Explorar Cursos</h1>
      <p className="text-gray-500 mb-8">{courses?.length ?? 0} cursos disponíveis</p>

      {/* Filtros de categoria */}
      <div className="flex flex-wrap gap-2 mb-10">
        <Link
          href="/cursos"
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !category ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todos
        </Link>
        {COURSE_CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/cursos?category=${encodeURIComponent(cat)}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === cat ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat}
          </Link>
        ))}
      </div>

      {!courses || courses.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <ChefHat className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum curso encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/curso/${course.slug}`}
              className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-video bg-gray-100">
                {course.thumbnail_url ? (
                  <Image src={course.thumbnail_url} alt={course.title} fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ChefHat className="h-10 w-10 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="p-4">
                {course.category && (
                  <span className="text-xs text-orange-600 font-medium">{course.category}</span>
                )}
                <h3 className="font-semibold text-gray-900 text-sm mt-1 line-clamp-2 group-hover:text-orange-600 transition-colors">
                  {course.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">por {(course.teacher as any)?.name}</p>
                <p className="text-orange-600 font-bold mt-2 text-sm">
                  {course.price === 0 ? 'Grátis' : formatCurrency(course.price)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
