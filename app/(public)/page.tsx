import Link from 'next/link'
import { createPublicClient } from '@/lib/supabase/public'
import { ActionLink } from '@/components/ui/action-link'
import { AzulejoWall } from '@/components/layout/AzulejoWall'
import { CourseCard } from '@/components/curso/CourseCard'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { BookOpen } from 'lucide-react'

export const revalidate = 300

const PASSOS = [
  {
    titulo: 'Escolha seu curso',
    desc: 'Navegue pelo catálogo por técnica, ingrediente ou chef. Da culinária básica à confeitaria avançada.',
  },
  {
    titulo: 'Assista às aulas',
    desc: 'Vídeo em alta definição, no seu ritmo, com caderno digital para anotar ponto, tempo e temperatura.',
  },
  {
    titulo: 'Compre os ingredientes',
    desc: 'No fim de cada aula, os utensílios e ingredientes que o chef usou ficam a um clique na loja.',
  },
]

const NUMEROS = [
  { valor: '500+', rotulo: 'Aulas disponíveis' },
  { valor: '50+', rotulo: 'Chefs instrutores' },
  { valor: '10k+', rotulo: 'Alunos formados' },
]

export default async function LandingPage() {
  let featuredCourses: any[] = []
  // Ler o `error` não bastava: a home continuava caindo no mesmo bloco de
  // "catálogo sendo montado", que é o estado normal de produto novo. Falha de
  // permissão e catálogo vazio precisam ser telas diferentes — foi assim que
  // o incidente de 10/08/2026 passou horas sem ninguém notar.
  let falhou = false
  try {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, slug, thumbnail_url, price, teacher:profiles(name)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(4)
    // supabase-js não lança em erro HTTP — sem ler `error`, um 401 de RLS
    // vira "nenhum curso" e a home anuncia catálogo em construção enquanto
    // o problema é permissão. Aconteceu de verdade em 10/08/2026.
    if (error) throw error
    featuredCourses = data ?? []
  } catch (err) {
    falhou = true
    console.error('[/] falha ao carregar cursos em destaque:', err)
  }

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="border-b border-cobalto/15 bg-cal">
        {/* A parede sangra até a borda direita da viewport — é o elemento
            principal da marca e perde força contida numa caixa central.
            O padding-left replica o eixo do container da Navbar
            (max-w-7xl = 80rem, lg:px-8 = 2rem) para o texto alinhar com o logo. */}
        <div className="grid items-stretch lg:grid-cols-[1fr_44%]">
          <div className="flex flex-col justify-center px-4 py-16 sm:px-6 lg:py-28 lg:pr-16 lg:pl-[max(2rem,calc((100vw-80rem)/2+2rem))]">
            <p className="olho surge text-brasa-escura">
              Cursos de culinária · Brasil
            </p>

            <h1
              className="surge mt-6 font-display text-[clamp(2.75rem,7vw,5.25rem)] font-extrabold leading-[0.94] tracking-[-0.03em] text-tinta"
              style={{ animationDelay: '80ms' }}
            >
              Cozinha brasileira,
              <br />
              ensinada por quem{' '}
              <span className="text-cobalto">vive dela</span>.
            </h1>

            <p
              className="surge mt-7 max-w-xl text-lg leading-relaxed text-tinta-suave"
              style={{ animationDelay: '160ms' }}
            >
              Aulas em vídeo com chefs, padeiros e confeiteiros. Do refogado ao
              ponto de bala — no seu ritmo, com os ingredientes e utensílios de
              cada aula à mão.
            </p>

            <div
              className="surge mt-10 flex flex-col gap-3 sm:flex-row"
              style={{ animationDelay: '240ms' }}
            >
              <ActionLink href="/cursos" size="lg">
                Explorar cursos
              </ActionLink>
              <ActionLink href="/cadastro?role=teacher" variant="contorno" size="lg">
                Quero ensinar
              </ActionLink>
            </div>
          </div>

          <AzulejoWall className="h-72 lg:h-auto lg:min-h-144" />
        </div>
      </section>

      {/* ---------- Números ---------- */}
      <section className="bg-cobalto-escuro">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
          <dl className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            {NUMEROS.map((n) => (
              <div
                key={n.rotulo}
                className="flex flex-col items-center sm:items-start"
              >
                {/* order inverte a ordem visual sem quebrar a semântica dt→dd */}
                <dt className="olho order-2 mt-3 text-cal/55">{n.rotulo}</dt>
                <dd className="order-1 font-display text-5xl font-extrabold tracking-tight text-brasa">
                  {n.valor}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="azulejo-claro faixa-azulejo" />

      {/* ---------- Como funciona ---------- */}
      <section className="bg-cal-fundo">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="olho text-brasa-escura">Como funciona</p>
            <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-tinta">
              Três passos, do catálogo à panela.
            </h2>
          </div>

          <ol className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {PASSOS.map((passo, i) => (
              <li
                key={passo.titulo}
                className="flex flex-col rounded-md border border-cobalto/15 bg-cal p-8 transition-colors hover:border-cobalto/40"
              >
                <span
                  aria-hidden="true"
                  className="azulejo-escuro flex h-12 w-12 items-center justify-center rounded-sm font-display text-lg font-extrabold text-cal [--azulejo-tamanho:48px]"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-6 font-display text-2xl font-bold tracking-tight text-tinta">
                  {passo.titulo}
                </h3>
                <p className="mt-3 leading-relaxed text-tinta-suave">
                  {passo.desc}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Cursos em destaque ---------- */}
      <section className="bg-cal">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="olho text-brasa-escura">Catálogo</p>
              <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-tinta">
                Cursos em destaque
              </h2>
            </div>
            <Link
              href="/cursos"
              className="text-sm font-semibold text-cobalto underline-offset-4 hover:underline"
            >
              Ver o catálogo completo →
            </Link>
          </div>

          <div className="mt-12">
            {featuredCourses.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {featuredCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            ) : falhou ? (
              <Notice
                tipo="erro"
                titulo="Não foi possível carregar os cursos."
                acao={
                  <ActionLink href="/cursos" variant="cobalto">
                    Ver o catálogo
                  </ActionLink>
                }
              >
                O problema é do nosso lado. Tente de novo em instantes.
              </Notice>
            ) : (
              <EmptyState
                icon={BookOpen}
                titulo="O catálogo está sendo montado"
                descricao="Os primeiros cursos entram em breve. Se você cozinha para viver, esse espaço pode ser seu."
                acao={
                  <ActionLink href="/para-chefs" variant="cobalto">
                    Ensinar na Chefio
                  </ActionLink>
                }
              />
            )}
          </div>
        </div>
      </section>

      {/* ---------- Chamada para professores ---------- */}
      <section className="azulejo-escuro relative">
        <div className="relative mx-auto max-w-4xl px-4 py-28 text-center sm:px-6 lg:px-8">
          <p className="olho text-brasa">Para quem ensina</p>
          <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-cal">
            Ensine o que você faz todo dia.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-cal/70">
            Publique seu curso, defina seu preço e receba por matrícula. A
            Chefio cuida do vídeo, do pagamento e da loja de ingredientes.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <ActionLink href="/cadastro?role=teacher" size="lg">
              Começar a ensinar
            </ActionLink>
            <ActionLink href="/para-chefs" variant="contornoClaro" size="lg">
              Como funciona para chefs
            </ActionLink>
          </div>
        </div>
      </section>
    </>
  )
}
