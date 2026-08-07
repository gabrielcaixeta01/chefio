import { requireRole } from '@/lib/auth/session'
import { ProfessorSidebar } from '@/components/layout/ProfessorSidebar'

export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  await requireRole('teacher')

  return (
    <div className="flex min-h-screen bg-cal-fundo">
      <ProfessorSidebar />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  )
}
