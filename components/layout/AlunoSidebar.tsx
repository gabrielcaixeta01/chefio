import { Sidebar } from './Sidebar'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser, roleFromUser } from '@/lib/auth/session'
import type { NavItem } from './Sidebar'

export async function AlunoSidebar() {
  // getAuthedUser() é cache()-deduped — o layout já chamou requireAuth(),
  // que chama a mesma função. Sem isso, cada sidebar validava a sessão de
  // novo contra o Auth server, um round trip a mais por navegação.
  const user = await getAuthedUser()
  const supabase = await createClient()

  // Decisão 4.3: esta área é de qualquer pessoa logada, então a barra tem que
  // dizer de onde a pessoa veio e como voltar. `teacher_profiles` é lida junto
  // porque é ela que separa "nunca pensou em ensinar" de "está esperando
  // resposta da candidatura".
  const [{ data: profile }, { data: candidatura }] = user
    ? await Promise.all([
        supabase.from('profiles').select('name').eq('id', user.id).maybeSingle(),
        supabase.from('teacher_profiles').select('status').eq('user_id', user.id).maybeSingle(),
      ])
    : [{ data: null }, { data: null }]

  const role = roleFromUser(user)

  const items: NavItem[] = [
    { label: 'Minha área', href: '/aluno', icon: 'LayoutDashboard' },
    { label: 'Meus cursos', href: '/aluno/cursos', icon: 'BookOpen' },
    { label: 'Loja', href: '/aluno/loja', icon: 'ShoppingBag' },
    { label: 'Pedidos', href: '/aluno/pedidos', icon: 'Package' },
  ]

  if (role === 'teacher') {
    items.push({ label: 'Área de professor', href: '/professor', icon: 'ChefHat' })
  } else if (role === 'admin' || role === 'owner') {
    items.push({ label: 'Administração', href: '/admin', icon: 'ClipboardList' })
  } else {
    items.push({
      label: candidatura ? 'Minha candidatura' : 'Quero ensinar',
      href: '/aluno/candidatura',
      icon: 'ChefHat',
    })
  }

  return (
    <Sidebar
      title="Aluno"
      items={items}
      userName={profile?.name}
    />
  )
}
