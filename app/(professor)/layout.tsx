import { requireRole } from '@/lib/auth/session'
import { ProfessorSidebar } from '@/components/layout/ProfessorSidebar'

export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  await requireRole('teacher')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ProfessorSidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
