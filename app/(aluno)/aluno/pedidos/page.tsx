import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { ClearCartOnSuccess } from '@/components/store/ClearCartOnSuccess'
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
    <div>
      {params.success && <ClearCartOnSuccess />}

      <h1 className="font-display text-3xl font-extrabold text-tinta mb-2 tracking-tight">Meus Pedidos</h1>
      <p className="text-tinta-suave mb-6">{orders?.length ?? 0} pedido(s)</p>

      {params.success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 flex items-center gap-3 mb-6">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-emerald-800 text-sm font-medium">
            Pedido realizado com sucesso! Você receberá um e-mail de confirmação.
          </p>
        </div>
      )}

      {!orders || orders.length === 0 ? (
        <div className="bg-cal rounded-md border border-cobalto/15 p-16 text-center">
          <Package className="h-12 w-12 text-cobalto/25 mx-auto mb-4" />
          <p className="text-tinta-suave font-medium">Nenhum pedido ainda</p>
          <p className="text-tinta-suave/70 text-sm mt-1">
            Explore a <a href="/aluno/loja" className="text-brasa-escura hover:underline">loja</a> e faça seu primeiro pedido.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const s = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending
            return (
              <div key={order.id} className="bg-cal rounded-md border border-cobalto/15 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-tinta-suave/70">
                      Pedido · {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="font-semibold text-tinta mt-0.5">{formatCurrency(order.total)}</p>
                  </div>
                  <span className={`rounded-sm px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] ${s.className}`}>
                    {s.label}
                  </span>
                </div>
                <div className="space-y-2">
                  {(itemsByOrder[order.id] ?? []).map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-cobalto/10 shrink-0 overflow-hidden">
                        {item.product?.image_url
                          ? <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                          : <Package className="h-4 w-4 text-cobalto/25 m-auto mt-2" />
                        }
                      </div>
                      <p className="text-sm text-tinta flex-1">{item.product?.name ?? 'Produto'}</p>
                      <p className="text-xs text-tinta-suave/70">x{item.quantity}</p>
                      <p className="text-sm font-medium text-tinta">{formatCurrency(item.unit_price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
