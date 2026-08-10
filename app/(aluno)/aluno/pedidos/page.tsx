import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { ClearCartOnSuccess } from '@/components/store/ClearCartOnSuccess'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel } from '@/components/ui/panel'
import { EmptyState } from '@/components/ui/empty-state'
import { Package, CheckCircle } from 'lucide-react'

export const metadata: Metadata = { title: 'Meus Pedidos' }

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('student_id', user!.id)
    .order('created_at', { ascending: false })

  const orderIds = (orders ?? []).map((o) => o.id)
  const { data: orderItemsRaw } = orderIds.length > 0
    ? await supabase
        .from('order_items')
        .select('*, product:products(name, image_url)')
        .in('order_id', orderIds)
    : { data: [] }

  const itemsByOrder: Record<string, any[]> = {}
  for (const item of orderItemsRaw ?? []) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = []
    itemsByOrder[item.order_id].push(item)
  }

  const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    pending: { label: 'Aguardando pagamento', className: 'bg-amber-50 text-amber-800' },
    paid: { label: 'Pago', className: 'bg-cobalto/15 text-cobalto' },
    shipped: { label: 'Enviado', className: 'bg-cobalto/15 text-cobalto' },
    delivered: { label: 'Entregue', className: 'bg-emerald-50 text-emerald-700' },
  }

  return (
    <>
      {params.success && <ClearCartOnSuccess />}

      <PageHeader
        olho="Compras"
        titulo="Meus pedidos"
        descricao={`${orders?.length ?? 0} ${orders?.length === 1 ? 'pedido' : 'pedidos'} registrados`}
      />

      <PageBody>
        {params.success && (
          <Panel className="mb-6 flex items-center gap-3 border-emerald-200 bg-emerald-50/80 p-4">
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-800">
              Pedido realizado com sucesso! Você receberá um e-mail de confirmação.
            </p>
          </Panel>
        )}

        {!orders || orders.length === 0 ? (
          <EmptyState
            icon={Package}
            titulo="Nenhum pedido ainda"
            descricao={
              <>
                Explore a <Link href="/aluno/loja" className="text-brasa-escura hover:underline">loja</Link> e faça seu primeiro pedido.
              </>
            }
          />
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const s = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending
              return (
                <Panel key={order.id} className="p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.08em] text-tinta-suave/70">
                        Pedido · {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="mt-0.5 font-semibold text-tinta">{formatCurrency(order.total)}</p>
                    </div>
                    <span className={`rounded-sm px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] ${s.className}`}>
                      {s.label}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {(itemsByOrder[order.id] ?? []).map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 rounded-sm border border-cobalto/10 bg-cal-fundo/60 px-3 py-2">
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-cobalto/10">
                          {item.product?.image_url ? (
                            <img src={item.product.image_url} alt={item.product.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="m-auto mt-2 h-4 w-4 text-cobalto/25" />
                          )}
                        </div>
                        <p className="flex-1 text-sm text-tinta">{item.product?.name ?? 'Produto'}</p>
                        <p className="text-xs text-tinta-suave/70">x{item.quantity}</p>
                        <p className="text-sm font-medium text-tinta">{formatCurrency(item.unit_price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                </Panel>
              )
            })}
          </div>
        )}
      </PageBody>
    </>
  )
}
