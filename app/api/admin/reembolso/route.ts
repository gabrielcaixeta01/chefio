import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getAuthedUser, roleFromUser } from '@/lib/auth/session'
import { executarReembolso } from '@/lib/pagamentos/reembolso'

/**
 * Decisão do admin sobre um pedido que passou de 30% assistido (decisão 2.1).
 * Aprovar devolve o dinheiro e desconta do professor; recusar só fecha o
 * pedido com a justificativa, e o aluno mantém o acesso.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthedUser()
  const role = roleFromUser(user)
  if (role !== 'admin' && role !== 'owner') {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 403 })
  }

  const { enrollmentId, decisao, nota } = await req.json().catch(() => ({}))
  if (!enrollmentId || (decisao !== 'aprovar' && decisao !== 'recusar')) {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: enrollment, error: enrollmentError } = await admin
    .from('enrollments')
    .select('id, amount_paid, stripe_payment_intent_id, refund_status')
    .eq('id', enrollmentId)
    .maybeSingle()

  if (enrollmentError) {
    console.error('Admin reembolso: matrícula não lida:', enrollmentError)
    return NextResponse.json({ erro: 'Erro ao buscar a matrícula.' }, { status: 500 })
  }

  if (!enrollment) {
    return NextResponse.json({ erro: 'Matrícula não encontrada.' }, { status: 404 })
  }
  if (enrollment.refund_status !== 'requested') {
    return NextResponse.json({ erro: 'Este pedido já foi resolvido.' }, { status: 409 })
  }

  if (decisao === 'recusar') {
    const { error: recusaError } = await admin
      .from('enrollments')
      .update({
        refund_status: 'rejected',
        refund_review_note: nota ?? null,
        refunded_by: user!.id,
      })
      .eq('id', enrollmentId)
    if (recusaError) {
      console.error('Admin reembolso: recusa não gravada:', recusaError)
      return NextResponse.json({ erro: 'Não foi possível registrar a recusa.' }, { status: 500 })
    }
    return NextResponse.json({ status: 'rejected' })
  }

  const resultado = await executarReembolso(admin, enrollment)
  if (!resultado.ok) {
    return NextResponse.json({ erro: resultado.erro }, { status: 502 })
  }

  // O dinheiro já voltou; falha aqui só perde a nota e o autor, então não
  // derruba a resposta.
  const { error: notaError } = await admin
    .from('enrollments')
    .update({ refund_review_note: nota ?? null, refunded_by: user!.id })
    .eq('id', enrollmentId)
  if (notaError) console.error('Admin reembolso: nota/autor não gravados:', notaError)

  return NextResponse.json({ status: 'refunded' })
}
