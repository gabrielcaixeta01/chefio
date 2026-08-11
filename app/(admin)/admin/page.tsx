import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { StatTile } from '@/components/ui/stat-tile'
import { Notice } from '@/components/ui/notice'
import { Button } from '@/components/ui/button'
import { BookOpen, Users, DollarSign, Clock, GraduationCap } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Dashboard' }

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Uma RPC no lugar de 5 round trips — a soma de amount_paid roda no
  // Postgres, não puxa a tabela de enrollments inteira pro Node.
  const { data: statsRows } = await supabase.rpc('get_admin_dashboard_stats')
  const s = statsRows?.[0]

  const totalCourses = s?.total_courses ?? 0
  const pendingCourses = s?.pending_courses ?? 0
  const totalTeachers = s?.total_teachers ?? 0
  const totalStudents = s?.total_students ?? 0
  const totalRevenue = s?.total_revenue ?? 0

  return (
    <>
      <PageHeader
        olho="Administração"
        titulo="Visão geral"
        descricao="O estado da plataforma num relance: o que entrou, quem publica e o que está esperando você."
        acoes={
          <Link href="/admin/cursos?status=pending_review">
            <Button variant="outline">Fila de revisão</Button>
          </Link>
        }
      />

      <PageBody>
        {/* A revisão pendente é a única coisa nesta página que exige ação —
            sobe pro topo em vez de virar o quarto número de uma fileira. */}
        {pendingCourses > 0 && (
          <Notice
            tipo="atencao"
            icon={Clock}
            titulo={`${pendingCourses} curso${pendingCourses === 1 ? '' : 's'} aguardando revisão`}
            className="mb-8"
            acao={
              <Link href="/admin/cursos?status=pending_review">
                <Button size="sm">Revisar agora</Button>
              </Link>
            }
          >
            Nenhum deles aparece no catálogo até você aprovar.
          </Notice>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile icon={DollarSign} label="Receita total" valor={formatCurrency(totalRevenue)} destaque />
          <StatTile icon={BookOpen} label="Cursos aprovados" valor={totalCourses} />
          <StatTile icon={Users} label="Professores" valor={totalTeachers} />
          <StatTile icon={GraduationCap} label="Alunos" valor={totalStudents} />
        </div>
      </PageBody>
    </>
  )
}
