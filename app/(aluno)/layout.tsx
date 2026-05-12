import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AlunoSidebar } from '@/components/layout/AlunoSidebar'
import { CartProvider } from '@/contexts/CartContext'

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'student') redirect('/')

  return (
    <CartProvider>
      <div className="flex min-h-screen bg-gray-50">
        <AlunoSidebar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </CartProvider>
  )
}
