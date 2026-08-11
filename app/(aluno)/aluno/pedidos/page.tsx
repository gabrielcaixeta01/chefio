import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { ClearCartOnSuccess } from '@/components/store/ClearCartOnSuccess'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel } from '@/components/ui/panel'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { StatusBadge } from '@/components/ui/status-badge'
import { Package } from 'lucide-react'

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
          <Notice tipo="sucesso" className="mb-6">
            Pedido realizado com sucesso! Você receberá um e-mail de confirmação.
          </Notice>
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
              return (
                <Panel key={order.id} className="p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="olho text-tinta-suave/70">
                        Pedido · {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="mt-1 font-display text-lg font-extrabold tabular-nums tracking-tight text-tinta">
                        {formatCurrency(order.total)}
                      </p>
                    </div>
                    <StatusBadge tipo="pedido" status={order.status} className="shrink-0" />
                  </div>
                  <div className="space-y-2">
                    {(itemsByOrder[order.id] ?? []).map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 rounded-sm border border-cobalto/10 bg-cal-fundo/60 px-3 py-2">
                        {/* flex+center em vez do `m-auto mt-2` de antes, que
                            centralizava o ícone só por coincidência de pixel */}
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-cobalto/10">
                          {item.product?.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element -- imagem de produto pode vir de host arbitrário
                            <img src={item.product.image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-4 w-4 text-cobalto/25" aria-hidden="true" />
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
