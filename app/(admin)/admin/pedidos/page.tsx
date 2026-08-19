import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { formatarCep, normalizarCep } from '@/lib/frete'
import { OrderStatusActions } from '@/components/admin/OrderStatusActions'
import { ReturnActions } from '@/components/admin/ReturnActions'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel, SectionHeading } from '@/components/ui/panel'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { Package, MapPin, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Pedidos' }

export default async function AdminOrdersPage() {
  const supabase = await createClient()

  // Pedido 'pending' é carrinho que virou checkout e nunca foi pago — nasce
  // assim desde a 00021 e não interessa a quem despacha.
  const { data: orders } = await supabase
    .from('orders')
    .select('*, student:profiles(name)')
    .neq('status', 'pending')
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
  const devolucoes = (orders ?? []).filter((o) => o.return_status === 'requested')

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
        {/* Fila da decisão 8.6, no topo: devolução tem prazo legal correndo e
            não pode ficar escondida no meio de cem pedidos entregues. */}
        {devolucoes.length > 0 && (
          <Panel className="mb-6 overflow-hidden">
            <SectionHeading
              titulo={`Devoluções aguardando decisão (${devolucoes.length})`}
              className="border-b border-cobalto/10 px-4 py-3"
            />
            <ul className="divide-y divide-cobalto/10">
              {devolucoes.map((order) => (
                <li key={order.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate text-sm font-medium text-tinta">
                      {(order.student as any)?.name ?? 'Aluno'} · {formatCurrency(order.total)}
                    </p>
                    <p className="mt-0.5 text-xs text-tinta-suave/70">
                      Pedido de {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      {order.delivered_at
                        ? ` · entregue em ${new Date(order.delivered_at).toLocaleDateString('pt-BR')}`
                        : ' · ainda não entregue'}
                      {order.return_requested_at
                        ? ` · pedido em ${new Date(order.return_requested_at).toLocaleDateString('pt-BR')}`
                        : ''}
                    </p>
                    {order.return_reason && (
                      <p className="mt-1.5 text-xs italic text-tinta-suave">“{order.return_reason}”</p>
                    )}
                  </div>
                  <ReturnActions orderId={order.id} />
                </li>
              ))}
            </ul>
          </Panel>
        )}

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
                // Decisão 8.2: o frete foi cotado pelo CEP digitado no carrinho,
                // mas o endereço final é o que a pessoa preencheu no Stripe. Se
                // os dois não batem, o valor cobrado não corresponde ao destino
                // — e quem descobre isso tem que ser o admin, antes de despachar.
                const cepDivergente =
                  !!order.quoted_postal_code &&
                  !!order.shipping_postal_code &&
                  normalizarCep(order.quoted_postal_code) !== normalizarCep(order.shipping_postal_code)

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

                      {order.shipping_line1 ? (
                        <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-tinta-suave">
                          <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-cobalto" aria-hidden="true" />
                          <span>
                            {order.shipping_name ? `${order.shipping_name} · ` : ''}
                            {order.shipping_line1}
                            {order.shipping_line2 ? `, ${order.shipping_line2}` : ''} —{' '}
                            {order.shipping_city}/{order.shipping_state}
                            {order.shipping_postal_code ? ` · ${formatarCep(order.shipping_postal_code)}` : ''}
                          </span>
                        </p>
                      ) : (
                        <p className="mt-1 text-xs font-semibold text-red-600">
                          Sem endereço de entrega — não despache.
                        </p>
                      )}

                      {cepDivergente && (
                        <p className="mt-1 flex items-start gap-1.5 text-xs font-semibold leading-relaxed text-amber-700">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                          <span>
                            Frete cotado para {formatarCep(order.quoted_postal_code!)}, entrega em{' '}
                            {formatarCep(order.shipping_postal_code!)} — confira o valor antes de enviar.
                          </span>
                        </p>
                      )}

                      {order.tracking_code && (
                        <p className="mt-1 text-xs tabular-nums text-tinta-suave/70">
                          Rastreio: {order.tracking_code}
                        </p>
                      )}
                    </div>
                    <StatusBadge tipo="pedido" status={order.status} className="shrink-0" />
                    <div className="shrink-0 text-right">
                      <span className="block text-sm font-semibold tabular-nums text-tinta">
                        {formatCurrency(order.total)}
                      </span>
                      {order.shipping_cost > 0 && (
                        <span className="block text-xs tabular-nums text-tinta-suave/70">
                          frete {formatCurrency(order.shipping_cost)}
                        </span>
                      )}
                    </div>
                    <OrderStatusActions
                      orderId={order.id}
                      status={order.status}
                      trackingCode={order.tracking_code}
                    />
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
