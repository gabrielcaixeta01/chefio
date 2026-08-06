import { Sidebar } from './Sidebar'
import { LayoutDashboard, BookOpen, ShoppingBag, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser } from '@/lib/auth/session'

export async function AlunoSidebar() {
  // getAuthedUser() é cache()-deduped — o layout já chamou requireRole(),
  // que chama a mesma função. Sem isso, cada sidebar validava a sessão de
  // novo contra o Auth server, um round trip a mais por navegação.
  const user = await getAuthedUser()
  const supabase = await createClient()
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
