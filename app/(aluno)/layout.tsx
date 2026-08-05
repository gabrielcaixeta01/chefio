import { requireRole } from '@/lib/auth/session'
import { AlunoSidebar } from '@/components/layout/AlunoSidebar'
import { CartProvider } from '@/contexts/CartContext'

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  await requireRole('student')

  return (
    <CartProvider>
      <div className="flex min-h-screen bg-gray-50">
        <AlunoSidebar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </CartProvider>
  )
}
