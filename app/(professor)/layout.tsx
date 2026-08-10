import { requireRole } from '@/lib/auth/session'
import { ProfessorSidebar } from '@/components/layout/ProfessorSidebar'
import { AppShell } from '@/components/layout/PageShell'

export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  await requireRole('teacher')

  return <AppShell sidebar={<ProfessorSidebar />}>{children}</AppShell>
}
