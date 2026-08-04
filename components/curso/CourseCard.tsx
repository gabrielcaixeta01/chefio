import Link from 'next/link'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'

export interface CourseCardData {
  id: string
  title: string
  slug: string
  thumbnail_url: string | null
  price: number
  category?: string | null
  teacher?: { name: string | null } | null
}

/** Card usado na home e no catálogo — mesma peça, um lugar só para mudar. */
export function CourseCard({
  course,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
}: {
  course: CourseCardData
  sizes?: string
}) {
  return (
    <Link
      href={`/curso/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-md border border-cobalto/15 bg-cal transition-all duration-200 hover:-translate-y-1 hover:border-cobalto/50"
    >
      <div className="relative aspect-4/3 overflow-hidden">
        {course.thumbnail_url ? (
          <Image
            src={course.thumbnail_url}
            alt={course.title}
            fill
            sizes={sizes}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          /* Sem thumbnail o próprio azulejo entra no lugar */
          <div
            aria-hidden="true"
            className="azulejo-escuro h-full w-full [--azulejo-tamanho:44px]"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {course.category && (
          <p className="olho mb-2 text-brasa-escura">{course.category}</p>
        )}
        <h3 className="font-display text-lg font-bold leading-snug tracking-tight text-tinta transition-colors group-hover:text-cobalto">
          {course.title}
        </h3>
        {course.teacher?.name && (
          <p className="mt-1.5 text-sm text-tinta-suave">
            por {course.teacher.name}
          </p>
        )}
        <p className="mt-5 font-display text-xl font-extrabold tabular-nums text-brasa-escura">
          {course.price === 0 ? 'Grátis' : formatCurrency(course.price)}
        </p>
      </div>
    </Link>
  )
}
