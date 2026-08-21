import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type CourseMeta = { aulas: number; duracaoSegundos: number }

/**
 * Tamanho de cada curso (nº de aulas e duração somada) para um lote de cursos.
 *
 * Lê `lessons_publicas` (00025) e não `lessons`: a tabela só entrega ao
 * anônimo as aulas marcadas como prévia, então contar por ela dava "1 aula"
 * num curso de 5.
 *
 * Uma query para o catálogo inteiro, não uma por card.
 */
export async function getCourseMeta(
  supabase: SupabaseClient<Database>,
  courseIds: string[]
): Promise<Map<string, CourseMeta>> {
  const meta = new Map<string, CourseMeta>()
  if (courseIds.length === 0) return meta

  const { data, error } = await supabase
    .from('lessons_publicas')
    .select('course_id, duration_seconds')
    .in('course_id', courseIds)

  // Aqui o erro é engolido de propósito, ao contrário do resto do projeto —
  // e a diferença é o que está em jogo. Isto é enriquecimento: sem ele o card
  // perde uma linha, com o catálogo inteiro intacto. Deixar estourar trocaria
  // "cards sem duração" por "catálogo fora do ar", que é muito pior. O perigo
  // que as outras correções combatem é falha se DISFARÇAR de estado normal;
  // não há disfarce quando o conteúdo principal continua correto na tela.
  if (error) {
    console.error('[course-meta] currículo indisponível, card sai sem tamanho:', error)
    return meta
  }

  for (const aula of data ?? []) {
    const atual = meta.get(aula.course_id) ?? { aulas: 0, duracaoSegundos: 0 }
    atual.aulas += 1
    atual.duracaoSegundos += aula.duration_seconds ?? 0
    meta.set(aula.course_id, atual)
  }

  return meta
}
