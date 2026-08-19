import { Sidebar } from './Sidebar'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser } from '@/lib/auth/session'
import type { NavItem } from './Sidebar'

export async function ProfessorSidebar() {
  // getAuthedUser() é cache()-deduped — o layout já chamou requireRole().
  const user = await getAuthedUser()
  const supabase = await createClient()
  const { data: profile } = user
    ? await supabase.from('profiles').select('name').eq('id', user.id).maybeSingle()
    : { data: null }

  const items = [
    { label: 'Dashboard', href: '/professor', icon: 'LayoutDashboard' },
    { label: 'Meus Cursos', href: '/professor/cursos', icon: 'BookOpen' },
    { label: 'Faturamento', href: '/professor/faturamento', icon: 'DollarSign' },
    // 'Documentos' saiu daqui: /professor/documentos nunca existiu e o item
    // dava 404. A tabela `documents`, a RLS e o bucket já estão prontos —
    // quando a página existir, é só devolver a linha.
    { label: 'Conta Stripe', href: '/professor/onboarding', icon: 'CreditCard' },
    // Decisão 4.3: a conta é a mesma. O chef que comprou o curso de outro
    // chega na biblioteca dele por aqui, sem trocar de login.
    { label: 'Área de aluno', href: '/aluno', icon: 'GraduationCap' },
  ] satisfies NavItem[]

  return (
    <Sidebar
      title="Professor"
      items={items}
      userName={profile?.name}
    />
  )
}
