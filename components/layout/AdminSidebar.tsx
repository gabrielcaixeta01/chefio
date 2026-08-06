import { Sidebar } from './Sidebar'
import { LayoutDashboard, Users, BookOpen, DollarSign, Package, ShoppingBag, ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export async function AdminSidebar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('name').eq('id', user.id).single()
    : { data: null }

  const items = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Professores', href: '/admin/professores', icon: Users },
    { label: 'Cursos', href: '/admin/cursos', icon: BookOpen },
    { label: 'Financeiro', href: '/admin/financeiro', icon: DollarSign },
    { label: 'Produtos', href: '/admin/produtos', icon: Package },
    { label: 'Pedidos', href: '/admin/pedidos', icon: ShoppingBag },
    { label: 'Matrículas', href: '/admin/matriculas', icon: ClipboardList },
  ]

  return (
    <Sidebar
      title="Administrador"
      subtitle="Painel admin"
      items={items}
      userName={profile?.name}
    />
  )
}
