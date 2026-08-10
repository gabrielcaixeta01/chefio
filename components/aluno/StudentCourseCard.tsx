import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, CheckCircle, PlayCircle } from 'lucide-react'
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <PlayCircle className="h-12 w-12 text-white" />
        </div>
        {concluido && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-sm bg-emerald-600 px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-white">
            <CheckCircle className="h-3 w-3" />
            Concluído
          </span>
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

export function CourseProgressBar({ course }: { course: StudentCourse }) {
  return (
    <>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-tinta-suave/70">
          {course.totalLessons === 0
            ? 'Sem aulas publicadas'
            : `${course.completedLessons} de ${course.totalLessons} aulas`}
        </span>
        <span className="font-bold text-brasa-escura">{course.progressPct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-sm bg-cobalto/10">
        <div
          className="h-1.5 rounded-sm bg-brasa transition-all duration-500"
          style={{ width: `${course.progressPct}%` }}
        />
      </div>
    </>
  )
}
