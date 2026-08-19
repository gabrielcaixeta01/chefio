import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { executarReembolso, progressoDoAluno, reembolsoEhAutomatico } from '@/lib/pagamentos/reembolso'

/**
 * Pedido de reembolso do aluno (decisão 2.1).
 *
 * A validação que importa — dono da matrícula, janela de 7 dias, pedido
 * único — roda dentro de `request_refund`, com a sessão do aluno. Só depois
 * que o pedido está gravado é que o service role entra pra calcular o
 * progresso e decidir se devolve na hora.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })

  const { enrollmentId, motivo } = await req.json().catch(() => ({}))
  if (!enrollmentId) {
    return NextResponse.json({ erro: 'Matrícula não informada.' }, { status: 400 })
  }

  const { error: pedidoError } = await supabase.rpc('request_refund', {
    p_enrollment_id: enrollmentId,
    p_reason: motivo ?? '',
  })

  if (pedidoError) {
    // As mensagens do raise vêm prontas pro aluno ("O prazo de 7 dias...").
    return NextResponse.json({ erro: pedidoError.message }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: enrollment } = await admin
    .from('enrollments')
    .select('id, student_id, course_id, amount_paid, stripe_payment_intent_id')
    .eq('id', enrollmentId)
    .maybeSingle()

  if (!enrollment) {
    return NextResponse.json({ status: 'requested' })
  }

  const progresso = await progressoDoAluno(admin, enrollment.student_id, enrollment.course_id)
  if (!reembolsoEhAutomatico(progresso)) {
    return NextResponse.json({ status: 'requested', progresso })
  }

  const resultado = await executarReembolso(admin, enrollment)
  if (!resultado.ok) {
    // O pedido continua em 'requested': o admin resolve na fila em vez de o
    // aluno ficar sem reembolso e sem registro.
    return NextResponse.json({ status: 'requested', erro: resultado.erro })
  }

  return NextResponse.json({ status: 'refunded' })
}
