import { Sidebar } from './Sidebar'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser } from '@/lib/auth/session'
import type { NavItem } from './Sidebar'

export async function AdminSidebar() {
  // getAuthedUser() é cache()-deduped — o layout já chamou requireRole().
  const user = await getAuthedUser()
  const supabase = await createClient()
  const { data: profile } = user
    ? await supabase.from('profiles').select('name').eq('id', user.id).maybeSingle()
    : { data: null }

  const items = [
    { label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
    { label: 'Professores', href: '/admin/professores', icon: 'Users' },
    { label: 'Cursos', href: '/admin/cursos', icon: 'BookOpen' },
    { label: 'Financeiro', href: '/admin/financeiro', icon: 'DollarSign' },
    { label: 'Produtos', href: '/admin/produtos', icon: 'Package' },
    { label: 'Pedidos', href: '/admin/pedidos', icon: 'ShoppingBag' },
    { label: 'Matrículas', href: '/admin/matriculas', icon: 'ClipboardList' },
    { label: 'Reembolsos', href: '/admin/reembolsos', icon: 'RotateCcw' },
    { label: 'Alterações', href: '/admin/alteracoes', icon: 'FileEdit' },
    { label: 'Cupons', href: '/admin/cupons', icon: 'Ticket' },
    { label: 'Minha conta', href: '/admin/conta', icon: 'User' },
  ] satisfies NavItem[]

  return (
    <Sidebar
      title="Administração"
      items={items}
      userName={profile?.name}
      // Sem `troca` aqui, e isso é uma correção do que eu mesmo tinha feito.
      // O atalho "Área de aluno" foi posto no admin por simetria com as
      // barras do aluno e do professor — mas simetria não era o argumento da
      // decisão 4.3. Ali o ponto é concreto: a conta do chef é a mesma que
      // compra curso dos outros, então ele precisa da biblioteca dele. Quem
      // administra não tem esse outro lado — chega em /aluno e encontra
      // biblioteca vazia, carrinho vazio e pedidos de mais ninguém. O atalho
      // anunciava uma segunda identidade que não existe.
      //
      // Para conferir a loja como um visitante vê, o rodapé da barra já tem
      // "Ver o site" — que é o destino honesto para essa intenção.
    />
  )
}
