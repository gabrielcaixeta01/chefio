import { createClient } from '@/lib/supabase/server'

export type StudentCourse = {
  enrollmentId: string
  enrolledAt: string
  id: string
  title: string
  slug: string
  thumbnailUrl: string | null
  teacherName: string
  totalLessons: number
  completedLessons: number
  progressPct: number
  /** Primeira aula ainda não concluída. `null` quando o curso acabou. */
  nextLesson: { id: string; title: string; position: number } | null
  /** Conclusão de aula mais recente do curso — ordena "continue de onde parou". */
  lastActivityAt: string | null
  status: 'nao_iniciado' | 'em_andamento' | 'concluido'
}

/** Linhas cruas do join de enrollments; o tipo gerado não cobre embeds aninhados. */
type EnrollmentRow = {
  id: string
  created_at: string
  course: {
    id: string
    title: string
    slug: string
    thumbnail_url: string | null
    teacher: { name: string | null } | null
  } | null
}

/**
 * Matrículas do aluno já cruzadas com lesson_progress. Usada tanto pelo painel
 * (/aluno) quanto pela biblioteca (/aluno/cursos) — as duas precisam do mesmo
 * cálculo de progresso, e duplicar isso foi o que fez as páginas nascerem iguais.
 *
 * São 3 queries independentes de tamanho fixo (matrículas → aulas → progresso),
 * não uma por curso.
 */
export async function getStudentCourses(studentId: string): Promise<StudentCourse[]> {
  const supabase = await createClient()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, created_at, course:courses(id, title, slug, thumbnail_url, teacher:profiles(name))')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  const rows = ((enrollments ?? []) as unknown as EnrollmentRow[]).filter((e) => e.course)
  if (rows.length === 0) return []

  const courseIds = rows.map((e) => e.course!.id)

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, course_id, title, order_index')
    .in('course_id', courseIds)
    .order('order_index', { ascending: true })

  const lessonRows = lessons ?? []
  const { data: progress } = lessonRows.length > 0
    ? await supabase
        .from('lesson_progress')
        .select('lesson_id, completed_at')
        .eq('student_id', studentId)
        .in('lesson_id', lessonRows.map((l) => l.id))
    : { data: [] }

  const completedAtByLesson = new Map<string, string>()
  for (const p of progress ?? []) {
    if (p.completed_at) completedAtByLesson.set(p.lesson_id, p.completed_at)
  }

  const lessonsByCourse = new Map<string, typeof lessonRows>()
  for (const lesson of lessonRows) {
    const list = lessonsByCourse.get(lesson.course_id) ?? []
    list.push(lesson)
    lessonsByCourse.set(lesson.course_id, list)
  }

  return rows.map((enrollment) => {
    const course = enrollment.course!
    const courseLessons = lessonsByCourse.get(course.id) ?? []

    let completedLessons = 0
    let lastActivityAt: string | null = null
    let nextLesson: StudentCourse['nextLesson'] = null

    courseLessons.forEach((lesson, index) => {
      const completedAt = completedAtByLesson.get(lesson.id)
      if (completedAt) {
        completedLessons++
        if (!lastActivityAt || completedAt > lastActivityAt) lastActivityAt = completedAt
      } else if (!nextLesson) {
        nextLesson = { id: lesson.id, title: lesson.title, position: index + 1 }
      }
    })

    const totalLessons = courseLessons.length
    const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

    return {
      enrollmentId: enrollment.id,
      enrolledAt: enrollment.created_at,
      id: course.id,
      title: course.title,
      slug: course.slug,
      thumbnailUrl: course.thumbnail_url,
      teacherName: course.teacher?.name ?? 'Professor',
      totalLessons,
      completedLessons,
      progressPct,
      nextLesson,
      lastActivityAt,
      status:
        totalLessons > 0 && completedLessons === totalLessons
          ? 'concluido'
          : completedLessons === 0
            ? 'nao_iniciado'
            : 'em_andamento',
    }
  })
}

/** Curso a retomar: última aula concluída mais recente, senão a matrícula mais nova. */
export function pickCourseToResume(courses: StudentCourse[]): StudentCourse | null {
  const emAberto = courses.filter((c) => c.status !== 'concluido')
  if (emAberto.length === 0) return null

  const comAtividade = emAberto.filter((c) => c.lastActivityAt)
  if (comAtividade.length > 0) {
    return comAtividade.reduce((a, b) => (a.lastActivityAt! > b.lastActivityAt! ? a : b))
  }
  // `courses` já vem ordenado por matrícula desc.
  return emAberto[0]
}
