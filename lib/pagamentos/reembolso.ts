import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, RefundStatus } from '@/types/database'
import { REEMBOLSO_AUTO_PROGRESSO_MAX } from '@/lib/utils'

type Admin = SupabaseClient<Database>

/**
 * Percentual de aulas concluídas pelo aluno no curso. É o que decide se o
 * reembolso sai na hora ou vai pra fila do admin (decisão 2.1) — curso sem
 * aula nenhuma conta como 0%, senão um curso vazio bloquearia o automático.
 */
export async function progressoDoAluno(
  admin: Admin,
  studentId: string,
  courseId: string
): Promise<number> {
  const { data: lessons } = await admin.from('lessons').select('id').eq('course_id', courseId)
  const ids = (lessons ?? []).map((l) => l.id)
  if (ids.length === 0) return 0

  const { count } = await admin
    .from('lesson_progress')
    .select('lesson_id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .in('lesson_id', ids)
    .not('completed_at', 'is', null)

  return Math.round(((count ?? 0) / ids.length) * 100)
}

export function reembolsoEhAutomatico(progressoPct: number): boolean {
  return progressoPct <= REEMBOLSO_AUTO_PROGRESSO_MAX
}

type EnrollmentParaReembolso = {
  id: string
  amount_paid: number
  stripe_payment_intent_id: string | null
}

/**
 * Devolve o dinheiro no gateway e fecha a matrícula na mesma chamada.
 *
 * O refund do Stripe vai SEM `reverse_transfer`: com split automático o
 * dinheiro do professor já saiu, e a decisão 2.2 é a plataforma devolver do
 * próprio caixa e cobrar depois. Quem lança esse débito é `process_refund`,
 * que grava um repasse negativo — por isso as duas coisas moram aqui juntas.
 *
 * `clawback: false` é o chargeback (2.4): a plataforma arca sozinha.
 */
export async function executarReembolso(
  admin: Admin,
  enrollment: EnrollmentParaReembolso,
  opcoes: { clawback?: boolean; status?: RefundStatus } = {}
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const { clawback = true, status = 'refunded' } = opcoes
  const valor = Number(enrollment.amount_paid ?? 0)

  if (valor > 0 && enrollment.stripe_payment_intent_id) {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { ok: false, erro: 'Gateway de pagamento não configurado.' }
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    try {
      await stripe.refunds.create({ payment_intent: enrollment.stripe_payment_intent_id })
    } catch (e) {
      // `charge_already_refunded` acontece quando o admin clica duas vezes ou
      // quando o reembolso saiu pelo painel do Stripe: o dinheiro já voltou,
      // então segue pra marcar a matrícula em vez de travar o fluxo.
      const code = (e as { code?: string })?.code
      if (code !== 'charge_already_refunded') {
        console.error('Refund error:', e)
        return { ok: false, erro: 'O gateway recusou o reembolso.' }
      }
    }
  }

  const { error } = await admin.rpc('process_refund', {
    p_enrollment_id: enrollment.id,
    p_amount: valor,
    p_clawback: clawback,
    p_status: status,
  })

  if (error) {
    // O dinheiro já voltou pro aluno neste ponto — sem o log não sobra rastro
    // de que a matrícula ficou aberta indevidamente.
    console.error('process_refund error:', error, 'enrollment:', enrollment.id)
    return { ok: false, erro: 'Reembolso feito no gateway, mas a matrícula não foi baixada.' }
  }

  return { ok: true }
}
