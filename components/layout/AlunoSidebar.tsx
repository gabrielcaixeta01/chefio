import { Sidebar } from './Sidebar'
import { LayoutDashboard, BookOpen, ShoppingBag, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export async function AlunoSidebar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('name').eq('id', user.id).single()
    : { data: null }

  const items = [
    { label: 'Minha área', href: '/aluno', icon: LayoutDashboard },
    { label: 'Meus cursos', href: '/aluno/cursos', icon: BookOpen },
    { label: 'Loja', href: '/aluno/loja', icon: ShoppingBag },
    { label: 'Pedidos', href: '/aluno/pedidos', icon: Package },
  ]

  return (
    <Sidebar
      title="Aluno"
      subtitle="Área do aluno"
      items={items}
      userName={profile?.name}
    />
  )
}
