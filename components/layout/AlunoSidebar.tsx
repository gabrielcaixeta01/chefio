import { Sidebar } from './Sidebar'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser } from '@/lib/auth/session'
import type { NavItem } from './Sidebar'

export async function AlunoSidebar() {
  // getAuthedUser() é cache()-deduped — o layout já chamou requireRole(),
  // que chama a mesma função. Sem isso, cada sidebar validava a sessão de
  // novo contra o Auth server, um round trip a mais por navegação.
  const user = await getAuthedUser()
  const supabase = await createClient()
  const { data: profile } = user
    ? await supabase.from('profiles').select('name').eq('id', user.id).maybeSingle()
    : { data: null }

  const items = [
    { label: 'Minha área', href: '/aluno', icon: 'LayoutDashboard' },
    { label: 'Meus cursos', href: '/aluno/cursos', icon: 'BookOpen' },
    { label: 'Loja', href: '/aluno/loja', icon: 'ShoppingBag' },
    { label: 'Pedidos', href: '/aluno/pedidos', icon: 'Package' },
  ] satisfies NavItem[]

  return (
    <Sidebar
      title="Aluno"
      items={items}
      userName={profile?.name}
    />
  )
}
