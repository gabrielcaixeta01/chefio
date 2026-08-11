import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { OrderStatusActions } from '@/components/admin/OrderStatusActions'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel } from '@/components/ui/panel'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { Package } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Pedidos' }

export default async function AdminOrdersPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('*, student:profiles(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  const orderIds = (orders ?? []).map((o) => o.id)
  const { data: orderItemsRaw } = orderIds.length > 0
    ? await supabase
        .from('order_items')
        .select('*, product:products(name)')
        .in('order_id', orderIds)
    : { data: [] }

  const itemsByOrder: Record<string, any[]> = {}
  for (const item of orderItemsRaw ?? []) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = []
    itemsByOrder[item.order_id].push(item)
  }

  const aDespachar = (orders ?? []).filter((o) => o.status === 'paid').length

  return (
    <>
      <PageHeader
        olho="Administração"
        titulo="Pedidos"
        descricao={
          aDespachar > 0
            ? `${orders?.length ?? 0} pedidos · ${aDespachar} pago${aDespachar === 1 ? '' : 's'} esperando envio`
            : `${orders?.length ?? 0} ${orders?.length === 1 ? 'pedido registrado' : 'pedidos registrados'}`
        }
      />

      <PageBody>
        {!orders || orders.length === 0 ? (
          <EmptyState
            icon={Package}
            titulo="Nenhum pedido ainda"
            descricao="As compras da loja aparecem aqui pra você acompanhar pagamento, envio e entrega."
          />
        ) : (
          <Panel>
            <ul className="divide-y divide-cobalto/10">
              {orders.map((order) => {
                const items = itemsByOrder[order.id] ?? []
                return (
                  <li key={order.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="truncate text-sm font-medium text-tinta">
                        {(order.student as any)?.name ?? 'Aluno'}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-tinta-suave/70">
                        {items.map((i) => `${i.quantity}x ${i.product?.name ?? 'Produto'}`).join(', ') || 'Sem itens'}
                        {' · '}
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <StatusBadge tipo="pedido" status={order.status} className="shrink-0" />
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-tinta">
                      {formatCurrency(order.total)}
                    </span>
                    <OrderStatusActions orderId={order.id} status={order.status} />
                  </li>
                )
              })}
            </ul>
          </Panel>
        )}
      </PageBody>
    </>
  )
}
