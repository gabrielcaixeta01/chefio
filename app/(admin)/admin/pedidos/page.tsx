import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { OrderStatusActions } from '@/components/admin/OrderStatusActions'
import { Package } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Pedidos' }

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Aguardando pagamento', className: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Pago', className: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Enviado', className: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Entregue', className: 'bg-green-100 text-green-700' },
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
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedidos</h1>
      <p className="text-gray-500 mb-6">{orders?.length ?? 0} pedido(s)</p>

      {!orders || orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nenhum pedido ainda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {orders.map((order) => {
            const s = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending
            const items = itemsByOrder[order.id] ?? []
            return (
              <div key={order.id} className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {(order.student as any)?.name ?? 'Aluno'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {items.map((i) => `${i.quantity}x ${i.product?.name ?? 'Produto'}`).join(', ') || 'Sem itens'}
                    {' · '}
                    {new Date(order.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${s.className}`}>
                  {s.label}
                </span>
                <span className="text-sm font-semibold text-gray-900 shrink-0 w-24 text-right">
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
