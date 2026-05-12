import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfessorSidebar } from '@/components/layout/ProfessorSidebar'

export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') redirect('/')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ProfessorSidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
