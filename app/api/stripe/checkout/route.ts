import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient, createAdminClient } from '@/lib/supabase/server'

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

  // Check not already enrolled
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', user.id)
    .eq('course_id', courseId)
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
    // 23505 = já matriculado (corrida de duplo clique) — segue pro curso.
    if (enrollError && enrollError.code !== '23505') {
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
  const commissionRate = teacherProfile?.commission_rate ?? 20
  const priceInCents = Math.round(course.price * 100)
  const appFeeInCents = Math.round(priceInCents * (commissionRate / 100))
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: { name: course.title },
          unit_amount: priceInCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      courseId,
      studentId: user.id,
      teacherId: course.teacher_id,
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
