import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { COMISSAO_PADRAO } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url), 302)

  // Vem de um <form> real (não fetch) — um NextResponse.json aqui renderiza
  // JSON cru na tela em vez de mostrar erro na página do curso.
  const formData = await req.formData()
  const courseId = formData.get('courseId') as string
  if (!courseId) return NextResponse.redirect(new URL('/cursos?erro=curso_invalido', req.url), 302)

  // `teacher_profiles` NÃO pode ser embutido aqui: não existe FK entre
  // `courses` e `teacher_profiles` (as duas apontam pra `profiles`), então o
  // PostgREST responde PGRST200 e derruba a query inteira. E mesmo com a FK,
  // a RLS de `teacher_profiles` não deixa o aluno ler a linha do professor —
  // um `!inner` sumiria com o curso. Por isso são duas queries, a segunda
  // com service role.
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, slug, price, teacher_id')
    .eq('id', courseId)
    .eq('status', 'approved')
    .maybeSingle()

  if (!course) return NextResponse.redirect(new URL('/cursos?erro=curso_indisponivel', req.url), 302)

  // Check not already enrolled. Matrícula reembolsada não conta: quem pediu
  // o dinheiro de volta pode comprar de novo, e o webhook reativa a linha
  // existente em vez de esbarrar no unique (student_id, course_id).
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', user.id)
    .eq('course_id', courseId)
    .is('refunded_at', null)
    .maybeSingle()

  if (existing) {
    return NextResponse.redirect(new URL(`/aluno/cursos/${course.slug}`, req.url), 302)
  }

  // Free course — enroll directly. Só o service role pode inserir em
  // enrollments (RLS não libera insert pro aluno), então usa o admin client.
  if (course.price === 0) {
    const admin = createAdminClient()
    const { error: enrollError } = await admin.from('enrollments').insert({
      student_id: user.id,
      course_id: courseId,
      amount_paid: 0,
    })
    // 23505 = já existe linha: ou corrida de duplo clique, ou matrícula
    // reembolsada sendo refeita — nos dois casos o destino é o curso.
    if (enrollError?.code === '23505') {
      await admin
        .from('enrollments')
        .update({ refund_status: 'none', refunded_at: null, refund_requested_at: null, refund_amount: null })
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .not('refunded_at', 'is', null)
    } else if (enrollError) {
      console.error('Free enrollment error:', enrollError)
      return NextResponse.redirect(new URL(`/curso/${course.slug}?erro=matricula_falhou`, req.url), 302)
    }
    return NextResponse.redirect(new URL(`/aluno/cursos/${course.slug}`, req.url), 302)
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.redirect(new URL(`/curso/${course.slug}?erro=stripe_nao_configurado`, req.url), 302)
  }

  const admin = createAdminClient()
  const { data: teacherProfile } = await admin
    .from('teacher_profiles')
    .select('stripe_account_id, commission_rate')
    .eq('user_id', course.teacher_id)
    .maybeSingle()

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const commissionRate = teacherProfile?.commission_rate ?? COMISSAO_PADRAO
  const priceInCents = Math.round(course.price * 100)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Cupom (decisão 2.6). A conferência é sempre aqui no servidor: a tabela
  // não tem policy de leitura pro aluno justamente pra ninguém varrer a
  // lista de códigos ativos pelo PostgREST.
  const cupomCode = (formData.get('cupom') as string | null)?.trim().toUpperCase()
  let coupon: { id: string; discount_percent: number } | null = null

  if (cupomCode) {
    const { data } = await admin
      .from('coupons')
      .select('id, discount_percent, course_id, max_redemptions, redemptions, expires_at')
      .eq('code', cupomCode)
      .eq('active', true)
      .maybeSingle()

    const valido =
      data &&
      (data.course_id === null || data.course_id === courseId) &&
      (data.expires_at === null || new Date(data.expires_at) > new Date()) &&
      (data.max_redemptions === null || data.redemptions < data.max_redemptions)

    if (!valido) {
      return NextResponse.redirect(new URL(`/curso/${course.slug}?erro=cupom_invalido`, req.url), 302)
    }
    coupon = { id: data!.id, discount_percent: data!.discount_percent }
  }

  const descontoInCents = coupon
    ? Math.round(priceInCents * (coupon.discount_percent / 100))
    : 0
  const totalInCents = priceInCents - descontoInCents

  // Quem absorve o desconto é a plataforma: o professor recebe sobre o preço
  // cheio, então a taxa é o que sobra depois de tirar a parte dele do valor
  // efetivamente cobrado. Se o desconto passa da comissão, a taxa fica
  // negativa — o Stripe recusaria, e a venda sairia com prejuízo.
  const teacherAmountInCents = Math.round(priceInCents * (1 - commissionRate / 100))
  const appFeeInCents = totalInCents - teacherAmountInCents

  if (coupon && appFeeInCents < 0) {
    return NextResponse.redirect(new URL(`/curso/${course.slug}?erro=cupom_invalido`, req.url), 302)
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: { name: course.title },
          unit_amount: totalInCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      courseId,
      studentId: user.id,
      teacherId: course.teacher_id,
      couponId: coupon?.id ?? '',
      discountAmount: (descontoInCents / 100).toFixed(2),
    },
    success_url: `${appUrl}/aluno/cursos/${course.slug}?success=true`,
    cancel_url: `${appUrl}/curso/${course.slug}`,
  }

  // Add split only if teacher has Stripe Connect account
  if (teacherProfile?.stripe_account_id) {
    sessionParams.payment_intent_data = {
      application_fee_amount: appFeeInCents,
      transfer_data: { destination: teacherProfile.stripe_account_id },
    }
  }

  const session = await stripe.checkout.sessions.create(sessionParams)
  return NextResponse.redirect(session.url!, 302)
}
