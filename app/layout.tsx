import type { Metadata } from 'next'
import { Archivo, Bricolage_Grotesque } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { RouteProgress } from '@/components/layout/RouteProgress'
import { CookieConsent } from '@/components/layout/CookieConsent'
import { ScriptsDeMedicao } from '@/components/layout/ScriptsDeMedicao'
import './globals.css'

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
})

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Chefio — Cursos de Culinária',
    template: '%s | Chefio',
  },
  description: 'Aprenda culinária com os melhores chefs. Cursos de gastronomia, panificação, confeitaria e muito mais.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${bricolage.variable}`}>
      <body>
        {/* Pular pro conteúdo: sem isso, quem navega por teclado atravessa a
            navbar inteira (ou os sete itens do menu lateral) em toda página.
            Só aparece quando recebe foco. */}
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-sm focus:bg-cobalto focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-cal"
        >
          Pular para o conteúdo
        </a>
        <RouteProgress />
        {children}
        <Toaster richColors position="top-right" />
        {/* Contagem de visitas: registra pageview a cada troca de rota, sem
            cookie e sem identificar ninguém — por isso fica fora do portão de
            consentimento. Só envia dado em produção. */}
        <Analytics />
        {/* Decisão 9.5: banner enquanto não houver escolha, e o portão onde
            entram GA, Pixel e afins quando existirem. */}
        <ScriptsDeMedicao />
        <CookieConsent />
      </body>
    </html>
  )
}
