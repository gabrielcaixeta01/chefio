import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAuthedUser } from '@/lib/auth/session'
import { formatCurrency, COMISSAO_PADRAO, COMISSAO_PRODUTO_PROFESSOR } from '@/lib/utils'
import { DollarSign, TrendingUp, Users, ExternalLink, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel, SectionHeading } from '@/components/ui/panel'
import { StatTile } from '@/components/ui/stat-tile'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { StatusBadge } from '@/components/ui/status-badge'

export const metadata: Metadata = { title: 'Faturamento' }

const ERROS: Record<string, string> = {
  stripe_nao_configurado: 'Pagamentos estão temporariamente indisponíveis.',
  conta_nao_conectada: 'Conecte sua conta Stripe antes de abrir o painel.',
  onboarding_incompleto: 'Termine o cadastro no Stripe para liberar o painel financeiro.',
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const { erro } = await searchParams
  const supabase = await createClient()
  const user = await getAuthedUser()

  const [
    { data: teacherProfile },
    { data: payouts },
    { data: pendentes },
    { data: repassesDeProduto },
    { data: revenueByCourse },
  ] = await Promise.all([
    supabase
      .from('teacher_profiles')
      .select('stripe_account_id, commission_rate, status')
      .eq('user_id', user!.id)
      .maybeSingle(),
    supabase
      .from('teacher_payouts')
      .select('*')
      .eq('teacher_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(10),
    // O histórico acima mostra só os 10 últimos; o retido precisa da soma
    // inteira (decisão 5.2).
    supabase
      .from('teacher_payouts')
      .select('amount')
      .eq('teacher_id', user!.id)
      .eq('status', 'pending'),
    // Comissão de produto (decisão 8.4) não entra em
    // `get_my_teacher_revenue_by_course`, que só olha matrícula. Vem daqui.
    supabase
      .from('teacher_payouts')
      .select('amount')
      .eq('teacher_id', user!.id)
      .in('type', ['product_sale', 'product_clawback']),
    supabase.rpc('get_my_teacher_revenue_by_course'),
  ])

  const retido = (pendentes ?? []).reduce((soma, p) => soma + (p.amount ?? 0), 0)
  const comissaoProdutos = (repassesDeProduto ?? []).reduce((soma, p) => soma + (p.amount ?? 0), 0)
  const commissionRate = teacherProfile?.commission_rate ?? COMISSAO_PADRAO
  const platformRate = commissionRate / 100

  const soldCourses = (revenueByCourse ?? []).filter((c) => c.sale_count > 0)
  const totalGross = soldCourses.reduce((sum, c) => sum + c.gross, 0)
  const totalSales = soldCourses.reduce((sum, c) => sum + c.sale_count, 0)
  const totalNet = totalGross * (1 - platformRate)

  const courseRevenue: Record<string, { title: string; count: number; gross: number }> =
    Object.fromEntries(
      soldCourses.map((c) => [c.course_id, { title: c.title, count: c.sale_count, gross: c.gross }])
    )

  return (
    <>
      <PageHeader
        olho="Financeiro"
        titulo="Faturamento"
        descricao={`Comissão da plataforma: ${commissionRate}%`}
        acoes={
          teacherProfile?.stripe_account_id ? (
            <a href="/api/stripe/connect/dashboard">
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Dashboard Stripe
              </Button>
            </a>
          ) : undefined
        }
      />

      <PageBody>
        {erro && ERROS[erro] && (
          <Notice tipo="erro" className="mb-8">
            {ERROS[erro]}
          </Notice>
        )}

        {/* Decisão 5.2: vender sem conta conectada é permitido — o dinheiro
            fica com a plataforma até ele conectar. Dizer "configure para
            receber" fazia parecer que a venda não vale. */}
        {!teacherProfile?.stripe_account_id && (
          <Notice
            tipo="atencao"
            titulo={retido > 0 ? `${formatCurrency(retido)} esperando você` : 'Conta de recebimento pendente'}
            className="mb-8"
            acao={
              <Link href="/professor/onboarding">
                <Button size="sm">Configurar agora</Button>
              </Link>
            }
          >
            {retido > 0
              ? 'Suas vendas continuam acontecendo normalmente e o valor fica guardado com a plataforma. Conecte sua conta Stripe para receber.'
              : 'Você já pode vender: a plataforma guarda o valor das vendas e repassa assim que sua conta Stripe estiver conectada.'}
          </Notice>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile icon={TrendingUp} label="Receita bruta" valor={formatCurrency(totalGross)} destaque />
          <StatTile icon={DollarSign} label="Ganhos líquidos" valor={formatCurrency(totalNet)} nota={`Após ${commissionRate}% de comissão`} />
          <StatTile icon={Users} label="Total de vendas" valor={totalSales} />
        </div>

        {/* Decisão 8.4: a comissão de produto não é receita de curso e não
            pode ser somada nos blocos acima — quem vê "receita bruta" espera
            o preço dos cursos vendidos. */}
        {comissaoProdutos !== 0 && (
          <Panel className="mb-8 flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-5 w-5 shrink-0 text-brasa-escura" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-tinta">Comissão de produtos</p>
                <p className="text-xs text-tinta-suave/70">
                  {COMISSAO_PRODUTO_PROFESSOR}% do que os alunos compram pela página das suas aulas.
                </p>
              </div>
            </div>
            <p className="font-display text-lg font-extrabold tabular-nums tracking-tight text-tinta">
              {formatCurrency(comissaoProdutos)}
            </p>
          </Panel>
        )}

        {Object.keys(courseRevenue).length > 0 && (
          <Panel className="mb-6 p-0">
            <SectionHeading titulo="Receita por curso" className="border-b border-cobalto/10 px-5 py-4" />
            <div className="divide-y divide-cobalto/10">
              {Object.entries(courseRevenue).map(([courseId, data]) => (
                <div key={courseId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-tinta">{data.title}</p>
                    <p className="text-xs text-tinta-suave/70">{data.count} venda(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-tinta">{formatCurrency(data.gross * (1 - platformRate))}</p>
                    <p className="text-xs text-tinta-suave/70">líquido</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <Panel className="p-0">
          <SectionHeading titulo="Histórico de repasses" className="border-b border-cobalto/10 px-5 py-4" />
          {!payouts || payouts.length === 0 ? (
            <div className="px-5 py-8">
              <EmptyState icon={DollarSign} titulo="Nenhum repasse registrado ainda" descricao="Quando houver pagamentos, eles aparecem aqui com status e data." />
            </div>
          ) : (
            <div className="divide-y divide-cobalto/10">
              {payouts.map((payout) => (
                <div key={payout.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-sm text-tinta">{formatCurrency(payout.amount)}</p>
                    <p className="text-xs text-tinta-suave/70">
                      {new Date(payout.created_at).toLocaleDateString('pt-BR')}
                      {/* Valor negativo sem rótulo assusta: é o desconto de um
                          curso que o aluno devolveu (decisão 2.2). */}
                      {payout.type === 'refund_clawback' && ' · estorno de reembolso'}
                      {payout.type === 'product_sale' && ' · comissão de produto'}
                      {payout.type === 'product_clawback' && ' · estorno de devolução de produto'}
                    </p>
                  </div>
                  <StatusBadge tipo="repasse" status={payout.status} className="shrink-0" />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </PageBody>
    </>
  )
}
