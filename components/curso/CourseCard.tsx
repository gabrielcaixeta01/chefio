import Link from 'next/link'
import Image from 'next/image'
import { formatCurrency, formatCourseDuration } from '@/lib/utils'

export interface CourseCardData {
  id: string
  title: string
  slug: string
  thumbnail_url: string | null
  price: number
  category?: string | null
  teacher?: { name: string | null } | null
  /** Tamanho do curso. Opcional: quem não passar simplesmente não mostra a linha. */
  aulas?: number
  duracaoSegundos?: number
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
            className="object-cover"
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

        {/* Tamanho do curso: é o que separa dois cards de mesmo preço. Fica no
            grupo de cima, não colado no preço, para que a presença ou ausência
            da linha não empurre o preço de altura. */}
        {course.aulas ? (
          <p className="mt-2 text-sm tabular-nums text-tinta-suave">
            {course.aulas} {course.aulas === 1 ? 'aula' : 'aulas'}
            {course.duracaoSegundos
              ? ` · ${formatCourseDuration(course.duracaoSegundos)}`
              : ''}
          </p>
        ) : null}

        {/* `mt-auto` e não `mt-5`: num grid de 4 colunas, título de uma linha e
            de duas colocavam o preço em alturas diferentes e a fileira de
            preços serrilhava. Ancorado no rodapé do card, alinha sempre. */}
        <p className="mt-auto pt-5 font-display text-xl font-extrabold tabular-nums text-brasa-escura">
          {course.price === 0 ? 'Grátis' : formatCurrency(course.price)}
        </p>
      </div>
    </Link>
  )
}
