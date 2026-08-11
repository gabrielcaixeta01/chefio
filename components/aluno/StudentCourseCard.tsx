import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, CheckCircle, PlayCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { StudentCourse } from '@/lib/data/student-courses'

/** Cartão de curso matriculado com progresso. Usado no painel e na biblioteca. */
export function StudentCourseCard({ course }: { course: StudentCourse }) {
  const concluido = course.status === 'concluido'

  return (
    <Link
      href={`/aluno/cursos/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-md border border-cobalto/15 bg-cal transition-all duration-200 hover:-translate-y-1 hover:border-cobalto/50"
    >
      <div className="relative aspect-video bg-cobalto/10">
        {course.thumbnailUrl ? (
          <Image src={course.thumbnailUrl} alt={course.title} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-cobalto/25" />
          </div>
        )}
        {/* Véu em cobalto, não preto: é o azul da marca escurecendo a capa,
            como o resto dos overlays do site. */}
        <div className="absolute inset-0 flex items-center justify-center bg-cobalto-escuro/55 opacity-0 transition-opacity group-hover:opacity-100">
          <PlayCircle className="h-12 w-12 text-cal" aria-hidden="true" />
        </div>
        {concluido && (
          <Badge variant="success" className="absolute left-2 top-2 gap-1 border-emerald-600/20">
            <CheckCircle className="h-3 w-3" aria-hidden="true" />
            Concluído
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-sm font-bold tracking-tight text-tinta line-clamp-2">
          {course.title}
        </h3>
        <p className="mt-1 text-xs text-tinta-suave">por {course.teacherName}</p>

        <div className="mt-auto pt-4">
          <CourseProgressBar course={course} />
        </div>
      </div>
    </Link>
  )
}

/** `tom="escuro"` é pro painel de "continue de onde parou", que corre sobre
    a parede de azulejo — no cal padrão o texto sumiria. */
export function CourseProgressBar({
  course,
  tom = 'claro',
}: {
  course: StudentCourse
  tom?: 'claro' | 'escuro'
}) {
  const escuro = tom === 'escuro'

  return (
    <>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className={escuro ? 'text-cal/70' : 'text-tinta-suave/70'}>
          {course.totalLessons === 0
            ? 'Sem aulas publicadas'
            : `${course.completedLessons} de ${course.totalLessons} aulas`}
        </span>
        <span className={`font-bold tabular-nums ${escuro ? 'text-brasa-clara' : 'text-brasa-escura'}`}>
          {course.progressPct}%
        </span>
      </div>
      <div className={`h-1.5 w-full rounded-sm ${escuro ? 'bg-cal/20' : 'bg-cobalto/10'}`}>
        <div
          className="h-1.5 rounded-sm bg-brasa transition-all duration-500"
          style={{ width: `${course.progressPct}%` }}
        />
      </div>
    </>
  )
}
