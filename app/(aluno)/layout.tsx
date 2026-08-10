import { requireRole } from '@/lib/auth/session'
import { AlunoSidebar } from '@/components/layout/AlunoSidebar'
import { AppShell } from '@/components/layout/PageShell'
import { CartProvider } from '@/contexts/CartContext'

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  await requireRole('student')

  return (
    <CartProvider>
      <AppShell sidebar={<AlunoSidebar />}>{children}</AppShell>
    </CartProvider>
  )
}
