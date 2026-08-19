import type { Metadata } from 'next'
import Link from 'next/link'
import { PRAZO_REVISAO_DIAS_UTEIS } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Política de conteúdo',
  description:
    'O que pode e o que não pode ser publicado na Chefio, de quem é o conteúdo do curso e como a plataforma usa trechos das aulas para divulgação.',
}

/** Muda quando o texto muda — é a data que aparece no cabeçalho. */
const ATUALIZADA_EM = '19 de agosto de 2026'

/**
 * Decisão 6.4: até aqui não havia política escrita e o admin decidia caso a
 * caso na revisão. Sem lista publicada, rejeitar um curso era palavra contra
 * palavra — e desde a 5.1 o motivo da rejeição é obrigatório e o professor
 * lê. Este é o texto que o motivo cita.
 *
 * As decisões 6.1 (de quem é o conteúdo) e 6.2 (uso de trechos em divulgação)
 * também moram aqui: são regras sobre conteúdo, e não fazia sentido deixá-las
 * esperando os termos de uso gerais.
 */
const PROIBIDOS = [
  {
    titulo: 'Conteúdo que não é seu',
    desc: 'Aula gravada por outra pessoa, vídeo baixado de outra plataforma, trilha sonora, foto ou apostila de terceiros sem autorização. Receita não tem dono, mas a gravação e o texto têm.',
  },
  {
    titulo: 'Prática ilegal na cozinha',
    desc: 'Preparo de carne de caça e de espécies protegidas, pescado fora do período permitido, bebida ou substância de venda proibida, e qualquer receita que dependa de ingrediente cuja posse seja crime.',
  },
  {
    titulo: 'Risco à saúde apresentado como técnica',
    desc: 'Conservação, cura ou fermentação ensinadas sem os cuidados que evitam contaminação, e dieta, jejum ou suplementação apresentados como tratamento médico. Ensinar a técnica pode; omitir o risco, não.',
  },
  {
    titulo: 'Ódio, assédio e discriminação',
    desc: 'Conteúdo que ataque pessoas ou grupos por raça, religião, origem, gênero, orientação sexual ou deficiência — na aula, no material de apoio ou na descrição do curso.',
  },
  {
    titulo: 'Conteúdo sexual e violência gratuita',
    desc: 'Nudez com finalidade sexual e imagens de violência que não tenham relação com o preparo do alimento. Abate e limpeza de animal são parte do ofício e podem aparecer, com aviso na descrição da aula.',
  },
  {
    titulo: 'Curso que não é curso',
    desc: 'Página de venda de outro produto, indicação para fechar negócio fora da plataforma, corrente de indicações, e aula vazia só para ocupar catálogo.',
  },
  {
    titulo: 'Dado de outra pessoa',
    desc: 'Telefone, endereço, documento ou imagem de alguém que não autorizou aparecer. Se um convidado aparece na aula, é você quem responde por essa autorização.',
  },
]

export default function PoliticaDeConteudoPage() {
  return (
    <>
      {/* ---------- Cabeçalho ---------- */}
      <section className="azulejo-escuro">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="olho text-brasa">Regras da casa</p>
          <h1 className="mt-4 font-display text-[clamp(2.5rem,5vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-cal">
            Política de conteúdo
          </h1>
          <p className="mt-4 max-w-2xl text-cal/70">
            Vale para todo curso publicado na Chefio. Atualizada em {ATUALIZADA_EM}.
          </p>
        </div>
      </section>

      <section className="bg-cal-fundo">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          {/* ---------- 6.1 ---------- */}
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-tinta">
            De quem é o conteúdo
          </h2>
          <p className="mt-4 leading-relaxed text-tinta-suave">
            O curso é seu. Você continua dono das aulas, do material de apoio e das receitas que
            gravou — a Chefio não vira proprietária de nada disso por você publicar aqui.
          </p>
          <p className="mt-4 leading-relaxed text-tinta-suave">
            O que você dá à plataforma é uma licença para hospedar e exibir o curso aos alunos. E
            essa licença é permanente para quem já comprou: se você tirar o curso do catálogo ou
            sair da Chefio, quem pagou continua assistindo ao que comprou, pelo tempo que a conta
            existir. É a mesma promessa que o aluno lê na hora da compra, e é ela que sustenta o
            preço que você cobra.
          </p>

          {/* ---------- 6.2 ---------- */}
          <h2 className="mt-12 font-display text-2xl font-extrabold tracking-tight text-tinta">
            Como a Chefio divulga seu curso
          </h2>
          <p className="mt-4 leading-relaxed text-tinta-suave">
            Podemos usar trechos curtos das suas aulas, a capa e o seu nome em anúncios, redes
            sociais, newsletter e nas páginas da própria plataforma — sempre identificando você
            como autor e sempre para divulgar o curso ou a Chefio, nunca para vender o conteúdo
            separadamente.
          </p>
          <p className="mt-4 leading-relaxed text-tinta-suave">
            Avisamos você antes de a peça ir ao ar. Se algum trecho específico não puder ser usado
            — imagem de um convidado, receita de um cliente, marca que aparece na bancada — é só
            responder ao aviso que a gente troca o trecho.
          </p>

          {/* ---------- 6.3 ---------- */}
          <h2 className="mt-12 font-display text-2xl font-extrabold tracking-tight text-tinta">
            Tamanho e duração
          </h2>
          <p className="mt-4 leading-relaxed text-tinta-suave">
            Não há limite de duração por aula nem de quantidade de aulas por curso. Grave no ritmo
            que a receita pedir.
          </p>

          {/* ---------- 6.4 ---------- */}
          <h2 className="mt-12 font-display text-2xl font-extrabold tracking-tight text-tinta">
            O que não pode
          </h2>
          <p className="mt-4 leading-relaxed text-tinta-suave">
            Curso com qualquer um dos pontos abaixo é rejeitado na revisão, e curso já publicado
            sai do catálogo quando isso aparece depois.
          </p>
          <dl className="mt-6 divide-y divide-cobalto/10 border-y border-cobalto/10">
            {PROIBIDOS.map((item) => (
              <div key={item.titulo} className="py-5">
                <dt className="font-display text-lg font-bold tracking-tight text-tinta">
                  {item.titulo}
                </dt>
                <dd className="mt-2 leading-relaxed text-tinta-suave">{item.desc}</dd>
              </div>
            ))}
          </dl>

          {/* ---------- Como isso é aplicado ---------- */}
          <h2 className="mt-12 font-display text-2xl font-extrabold tracking-tight text-tinta">
            Como aplicamos
          </h2>
          <p className="mt-4 leading-relaxed text-tinta-suave">
            Todo curso passa por revisão antes de entrar no catálogo, e a resposta sai em até{' '}
            {PRAZO_REVISAO_DIAS_UTEIS} dias úteis. Se algo aqui não for cumprido, o curso volta
            para você com o motivo escrito e você corrige e reenvia quantas vezes precisar.
          </p>
          <p className="mt-4 leading-relaxed text-tinta-suave">
            Em caso grave — conteúdo de terceiros, ilegalidade, ataque a pessoas — o curso sai do
            catálogo na hora e a conta de professor pode ser suspensa. Quem já tinha comprado não
            perde o acesso: a promessa ao aluno vale mesmo quando o problema é nosso para resolver.
          </p>
          <p className="mt-4 leading-relaxed text-tinta-suave">
            Viu um curso que não deveria estar aqui? Avise a equipe da Chefio pelo canal de
            suporte. Todo aviso é revisado.
          </p>

          <p className="mt-12 border-t border-cobalto/10 pt-8 text-sm text-tinta-suave/70">
            Quer publicar um curso?{' '}
            <Link
              href="/para-chefs"
              className="font-semibold text-cobalto underline-offset-4 hover:underline"
            >
              Veja como funciona para quem ensina
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  )
}
