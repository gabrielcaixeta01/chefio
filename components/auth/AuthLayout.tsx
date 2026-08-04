import Link from 'next/link'
import { AzulejoWall } from '@/components/layout/AzulejoWall'

interface AuthLayoutProps {
  olho: string
  titulo: string
  descricao: string
  children: React.ReactNode
}

/**
 * Casca das telas de login e cadastro: parede de azulejo à esquerda, formulário
 * à direita. Abaixo de lg a parede vira uma faixa fina no topo — a parede
 * inteira no celular empurraria o formulário para fora da primeira dobra.
 *
 * A altura desconta os 4rem da Navbar, que continua presente nessas telas.
 */
export function AuthLayout({
  olho,
  titulo,
  descricao,
  children,
}: AuthLayoutProps) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      {/* Painel — só a partir de lg */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-end">
        <AzulejoWall className="absolute inset-0" />

        <div className="relative z-10 p-12 xl:p-16">
          <p className="olho text-brasa">{olho}</p>
          <p className="mt-5 max-w-md font-display text-[clamp(2rem,3vw,2.75rem)] font-extrabold leading-[1.04] tracking-[-0.02em] text-cal">
            {titulo}
          </p>
          <p className="mt-4 max-w-sm leading-relaxed text-cal/70">
            {descricao}
          </p>
        </div>
      </div>

      {/* Faixa de azulejo no lugar do painel abaixo de lg */}
      <div className="azulejo-claro faixa-azulejo lg:hidden" />

      {/* Formulário */}
      <div className="flex items-center justify-center bg-cal px-4 py-14 sm:px-8">
        <div className="w-full max-w-md">
          {children}

          <p className="mt-10 text-center text-xs text-tinta-suave">
            <Link href="/" className="underline-offset-4 hover:underline">
              Voltar para a home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
