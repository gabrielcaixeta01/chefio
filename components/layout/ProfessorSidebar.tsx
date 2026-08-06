import { Sidebar } from './Sidebar'
import { LayoutDashboard, BookOpen, DollarSign, FileText, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser } from '@/lib/auth/session'

export async function ProfessorSidebar() {
  // getAuthedUser() é cache()-deduped — o layout já chamou requireRole().
  const user = await getAuthedUser()
  const supabase = await createClient()
  const { data: profile } = user
    ? await supabase.from('profiles').select('name').eq('id', user.id).single()
    : { data: null }

  const items = [
    { label: 'Dashboard', href: '/professor', icon: LayoutDashboard },
    { label: 'Meus Cursos', href: '/professor/cursos', icon: BookOpen },
    { label: 'Faturamento', href: '/professor/faturamento', icon: DollarSign },
    { label: 'Documentos', href: '/professor/documentos', icon: FileText },
    { label: 'Conta Stripe', href: '/professor/onboarding', icon: CreditCard },
  ]

  return (
    <Sidebar
      title="Professor"
      subtitle="Área do professor"
      items={items}
      userName={profile?.name}
    />
  )
}
