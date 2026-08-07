import { Sidebar } from './Sidebar'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser } from '@/lib/auth/session'
import type { NavItem } from './Sidebar'

export async function AdminSidebar() {
  // getAuthedUser() é cache()-deduped — o layout já chamou requireRole().
  const user = await getAuthedUser()
  const supabase = await createClient()
  const { data: profile } = user
    ? await supabase.from('profiles').select('name').eq('id', user.id).single()
    : { data: null }

  const items = [
    { label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
    { label: 'Professores', href: '/admin/professores', icon: 'Users' },
    { label: 'Cursos', href: '/admin/cursos', icon: 'BookOpen' },
    { label: 'Financeiro', href: '/admin/financeiro', icon: 'DollarSign' },
    { label: 'Produtos', href: '/admin/produtos', icon: 'Package' },
    { label: 'Pedidos', href: '/admin/pedidos', icon: 'ShoppingBag' },
    { label: 'Matrículas', href: '/admin/matriculas', icon: 'ClipboardList' },
  ] satisfies NavItem[]

  return (
    <Sidebar
      title="Administrador"
      items={items}
      userName={profile?.name}
    />
  )
}
