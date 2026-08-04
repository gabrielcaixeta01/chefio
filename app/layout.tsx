import type { Metadata } from 'next'
import { Archivo, Bricolage_Grotesque } from 'next/font/google'
import { Toaster } from 'sonner'
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
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
