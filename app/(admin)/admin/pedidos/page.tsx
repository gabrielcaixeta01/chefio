import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { OrderStatusActions } from '@/components/admin/OrderStatusActions'
import { Package } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Pedidos' }

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Aguardando pagamento', className: 'bg-amber-50 text-amber-800' },
  paid: { label: 'Pago', className: 'bg-cobalto/15 text-cobalto' },
  shipped: { label: 'Enviado', className: 'bg-cobalto/15 text-cobalto' },
  delivered: { label: 'Entregue', className: 'bg-emerald-50 text-emerald-700' },
}

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

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-tinta mb-2 tracking-tight">Pedidos</h1>
      <p className="text-tinta-suave mb-6">{orders?.length ?? 0} pedido(s)</p>

      {!orders || orders.length === 0 ? (
        <div className="bg-cal rounded-md border border-cobalto/15 p-16 text-center">
          <Package className="h-10 w-10 text-cobalto/25 mx-auto mb-3" />
          <p className="text-tinta-suave/70 text-sm">Nenhum pedido ainda.</p>
        </div>
      ) : (
        <div className="bg-cal rounded-md border border-cobalto/15 divide-y divide-cobalto/10">
          {orders.map((order) => {
            const s = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending
            const items = itemsByOrder[order.id] ?? []
            return (
              <div key={order.id} className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-tinta text-sm truncate">
                    {(order.student as any)?.name ?? 'Aluno'}
                  </p>
                  <p className="text-xs text-tinta-suave/70 mt-0.5 truncate">
                    {items.map((i) => `${i.quantity}x ${i.product?.name ?? 'Produto'}`).join(', ') || 'Sem itens'}
                    {' · '}
                    {new Date(order.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className={`rounded-sm px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] shrink-0 ${s.className}`}>
                  {s.label}
                </span>
                <span className="text-sm font-semibold text-tinta shrink-0 w-24 text-right">
                  {formatCurrency(order.total)}
                </span>
                <div className="shrink-0">
                  <OrderStatusActions orderId={order.id} status={order.status} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
