import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

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
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
