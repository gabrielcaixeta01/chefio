import { requireAuth } from '@/lib/auth/session'
import { AlunoSidebar } from '@/components/layout/AlunoSidebar'
import { AppShell } from '@/components/layout/PageShell'
import { CartProvider } from '@/contexts/CartContext'

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  // Decisão 4.3: professor e admin também entram aqui — é onde ficam os
  // cursos que ELES compraram.
  await requireAuth()

  return (
    <CartProvider>
      <AppShell sidebar={<AlunoSidebar />}>{children}</AppShell>
    </CartProvider>
  )
}
