import type { Metadata } from 'next'
import { Video, CreditCard, ShoppingBag, Users } from 'lucide-react'
import { AzulejoWall } from '@/components/layout/AzulejoWall'
import { PassosNumerados } from '@/components/layout/PassosNumerados'
import { ActionLink } from '@/components/ui/action-link'
import { COMISSAO_PADRAO } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Ensinar na Chefio',
  description:
    'Publique seu curso de culinária, defina seu preço e receba por matrícula. A Chefio cuida do vídeo, do pagamento e da loja de ingredientes.',
}


const PASSOS = [
  {
    titulo: 'Monte o curso',
    desc: 'Crie o curso, organize as aulas na ordem que fizer sentido e envie os vídeos direto pela plataforma.',
  },
  {
    titulo: 'Publique',
    desc: 'Você define o preço e a categoria. O curso passa por uma revisão da equipe antes de entrar no catálogo.',
  },
  {
    titulo: 'Receba por matrícula',
    desc: 'Cada aluno que se matricula gera um repasse na sua conta conectada, com o extrato no seu painel.',
  },
]

const CUIDADOS = [
  {
    icone: Video,
    titulo: 'Hospedagem do vídeo',
    desc: 'Upload, processamento e entrega das aulas com acesso protegido — sem YouTube, sem link vazando.',
  },
  {
    icone: CreditCard,
    titulo: 'Pagamento',
    desc: 'Checkout, cobrança e repasse pela sua conta conectada. Você acompanha o faturamento no painel.',
  },
  {
    icone: ShoppingBag,
    titulo: 'Loja de ingredientes',
    desc: 'Os utensílios e ingredientes da sua aula aparecem para o aluno na hora certa, dentro da plataforma.',
  },
  {
    icone: Users,
    titulo: 'Alunos e matrículas',
    desc: 'Controle de acesso, matrículas e progresso das aulas ficam por conta da Chefio.',
  },
]

const DUVIDAS = [
  {
    p: 'Quanto custa publicar um curso?',
    r: `Nada para publicar. A Chefio fica com uma comissão de ${COMISSAO_PADRAO}% sobre cada matrícula — você recebe o restante. Não há mensalidade nem taxa de entrada.`,
  },
  {
    p: 'Quem define o preço do curso?',
    r: 'Você. O preço é definido por curso no momento da publicação e pode ser alterado depois. Cursos gratuitos também são permitidos.',
  },
  {
    p: 'Meu curso vai ao ar na hora?',
    r: 'Não. Todo curso passa por uma revisão da equipe antes de entrar no catálogo. Se algo precisar de ajuste, você recebe o motivo e pode reenviar.',
  },
  {
    p: 'Como eu recebo o dinheiro?',
    r: 'Você conecta uma conta de recebimento no onboarding. Os repasses das matrículas caem nessa conta, e o extrato fica no seu painel de faturamento.',
  },
  // Decisões 4.2 e 4.5: as duas condições de entrada que valem dizer antes do
  // cadastro, não depois.
  {
    p: 'Qualquer pessoa pode dar aula aqui?',
    r: 'Não automaticamente. Você se cadastra, envia uma candidatura com documento, contato e um resumo da sua experiência, e um admin analisa. Enquanto isso sua conta funciona normalmente como aluno.',
  },
  {
    p: 'Posso vender o mesmo curso em outra plataforma?',
    r: 'Não. Os cursos publicados na Chefio são exclusivos daqui enquanto estiverem no catálogo — o aceite dessa condição faz parte da candidatura. Você segue livre para dar aulas presenciais e publicar outro conteúdo onde quiser.',
  },
]

export default function ParaChefsPage() {
  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="border-b border-cobalto/15 bg-cal">
        <div className="grid items-stretch lg:grid-cols-[1fr_44%]">
          <div className="flex flex-col justify-center px-4 py-16 sm:px-6 lg:py-28 lg:pr-16 lg:pl-[max(2rem,calc((100vw-80rem)/2+2rem))]">
            <p className="olho surge text-brasa-escura">Para quem ensina</p>

            <h1
              className="surge mt-6 font-display text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[0.96] tracking-[-0.03em] text-tinta"
              style={{ animationDelay: '80ms' }}
            >
              Sua cozinha já é{' '}
              <span className="text-cobalto">uma aula</span>.
            </h1>

            <p
              className="surge mt-7 max-w-xl text-lg leading-relaxed text-tinta-suave"
              style={{ animationDelay: '160ms' }}
            >
              Chef, padeiro, confeiteiro: o que você faz todo dia tem quem queira
              aprender. Publique seu curso, defina seu preço e receba por
              matrícula.
            </p>

            <div
              className="surge mt-10 flex flex-col gap-3 sm:flex-row"
              style={{ animationDelay: '240ms' }}
            >
              <ActionLink href="/cadastro?role=teacher" size="lg">
                Começar a ensinar
              </ActionLink>
              <ActionLink href="/cursos" variant="contorno" size="lg">
                Ver o catálogo
              </ActionLink>
            </div>
          </div>

          <AzulejoWall className="h-72 lg:h-auto lg:min-h-144" />
        </div>
      </section>

      {/* ---------- Comissão ---------- */}
      <section className="bg-cobalto-escuro">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-8 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="olho text-brasa">O acordo</p>
            <p className="mt-4 max-w-lg font-display text-3xl font-extrabold leading-tight tracking-tight text-cal">
              Você fica com {100 - COMISSAO_PADRAO}% de cada matrícula.
            </p>
            <p className="mt-3 max-w-md text-cal/70">
              Sem mensalidade, sem taxa para publicar. A Chefio só ganha quando
              você ganha.
            </p>
          </div>
          <p
            aria-hidden="true"
            className="font-display text-[6rem] font-extrabold leading-none tracking-tighter text-brasa md:text-[8rem]"
          >
            {100 - COMISSAO_PADRAO}%
          </p>
        </div>
      </section>

      <div className="azulejo-claro faixa-azulejo" />

      {/* ---------- Como funciona ---------- */}
      <section className="bg-cal-fundo">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="olho text-brasa-escura">Como funciona</p>
            <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-tinta">
              Do vídeo ao repasse, em três passos.
            </h2>
          </div>

          <PassosNumerados passos={PASSOS} />
        </div>
      </section>

      {/* ---------- O que a Chefio cuida ---------- */}
      <section className="bg-cal">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="olho text-brasa-escura">O que fica com a gente</p>
            <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-tinta">
              Você cozinha. O resto é problema nosso.
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-md border border-cobalto/20 bg-cobalto/20 sm:grid-cols-2">
            {CUIDADOS.map((item) => {
              const Icone = item.icone
              return (
                <div key={item.titulo} className="bg-cal p-8">
                  <Icone
                    aria-hidden="true"
                    className="h-7 w-7 text-brasa-escura"
                  />
                  <h3 className="mt-5 font-display text-xl font-bold tracking-tight text-tinta">
                    {item.titulo}
                  </h3>
                  <p className="mt-2.5 leading-relaxed text-tinta-suave">
                    {item.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------- Dúvidas ---------- */}
      <section className="bg-cal-fundo">
        <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
          <p className="olho text-brasa-escura">Dúvidas</p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-tinta">
            Antes de você perguntar.
          </h2>

          {/* <details> nativo: acordeão acessível sem client component */}
          <div className="mt-12 divide-y divide-cobalto/15 border-y border-cobalto/15">
            {DUVIDAS.map((duvida) => (
              <details key={duvida.p} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold tracking-tight text-tinta marker:content-none">
                  {duvida.p}
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-2xl font-normal text-brasa transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl leading-relaxed text-tinta-suave">
                  {duvida.r}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA final ---------- */}
      <section className="azulejo-escuro">
        <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-cal">
            Comece pelo primeiro curso.
          </h2>
          <p className="mx-auto mt-5 max-w-lg leading-relaxed text-cal/70">
            Criar a conta leva um minuto. Você monta o curso no seu tempo e
            publica quando estiver pronto.
          </p>
          <div className="mt-9 flex justify-center">
            <ActionLink href="/cadastro?role=teacher" size="lg">
              Criar conta de professor
            </ActionLink>
          </div>
        </div>
      </section>
    </>
  )
}
