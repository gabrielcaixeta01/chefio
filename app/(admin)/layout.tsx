import { requireRole } from '@/lib/auth/session'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { AppShell } from '@/components/layout/PageShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole('admin')

  // AppShell, e não um flex à mão: a Sidebar virou gaveta em telas < lg e
  // renderiza uma barra fixa de 56px no topo. O layout antigo não abria espaço
  // pra ela, então no celular o título de toda página do admin ficava embaixo
  // da barra.
  return <AppShell sidebar={<AdminSidebar />}>{children}</AppShell>
}
