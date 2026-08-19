import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ProductForm, type PedidoDeProduto } from '@/components/admin/ProductForm'
import { ProductRequestActions } from '@/components/admin/ProductRequestActions'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel, SectionHeading } from '@/components/ui/panel'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { Package } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Produtos' }

const PAGE_SIZE = 20

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pedido?: string }>
}) {
  const { page: pageParam, pedido: pedidoParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()

  // Fila da decisão 8.5. `teacher:profiles(name)` funciona porque
  // product_requests só tem uma FK pra profiles — nenhuma ambiguidade.
  const [{ data: products, count }, { data: pedidos }] = await Promise.all([
    supabase
      .from('products')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to),
    supabase
      .from('product_requests')
      .select('*, teacher:profiles(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
  ])

  const pedidoSelecionado = (pedidos ?? []).find((p) => p.id === pedidoParam)
  const pedidoParaForm: PedidoDeProduto | null = pedidoSelecionado
    ? {
        id: pedidoSelecionado.id,
        name: pedidoSelecionado.name,
        description: pedidoSelecionado.description,
        reference_url: pedidoSelecionado.reference_url,
        suggested_price: pedidoSelecionado.suggested_price,
        teacherName: (pedidoSelecionado.teacher as any)?.name ?? null,
      }
    : null

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))
  const semEstoque = (products ?? []).filter((p) => p.stock <= 0).length

  return (
    <>
      <PageHeader
        olho="Administração"
        titulo="Produtos"
        descricao={
          semEstoque > 0
            ? `${count ?? 0} cadastrados · ${semEstoque} sem estoque`
            : `${count ?? 0} ${count === 1 ? 'produto cadastrado' : 'produtos cadastrados'}`
        }
      />

      <PageBody>
        {/* O formulário sobe pro topo no celular: cadastrar é a ação principal
            desta tela, e ficava enterrado abaixo de vinte linhas de lista. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:order-2 lg:col-span-1">
            {/* `key` força o formulário a remontar quando o admin troca de
                pedido — sem isso os defaultValues do react-hook-form ficam
                presos no primeiro que abriu. */}
            <ProductForm key={pedidoParaForm?.id ?? 'novo'} pedido={pedidoParaForm} />
          </div>

          <div className="lg:order-1 lg:col-span-2">
            {/* Decisão 8.5: professor pede, admin cadastra. A fila vem antes do
                catálogo porque tem alguém esperando resposta do outro lado. */}
            {pedidos && pedidos.length > 0 && (
              <Panel className="mb-6 overflow-hidden">
                <SectionHeading
                  titulo={`Pedidos de professores (${pedidos.length})`}
                  className="border-b border-cobalto/10 px-4 py-3"
                />
                <ul className="divide-y divide-cobalto/10">
                  {pedidos.map((pedido) => (
                    <li key={pedido.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                      <div className="min-w-0 flex-1 basis-56">
                        <p className="truncate text-sm font-medium text-tinta">{pedido.name}</p>
                        <p className="mt-0.5 truncate text-xs text-tinta-suave/70">
                          {(pedido.teacher as any)?.name ?? 'Professor'} ·{' '}
                          {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                          {pedido.suggested_price
                            ? ` · sugerido ${formatCurrency(pedido.suggested_price)}`
                            : ''}
                        </p>
                        {pedido.description && (
                          <p className="mt-1.5 line-clamp-2 text-xs italic text-tinta-suave">
                            “{pedido.description}”
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          href={`/admin/produtos?pedido=${pedido.id}`}
                          className="inline-flex h-8 items-center rounded-sm border-2 border-cobalto/20 px-3 text-xs font-semibold text-cobalto transition-colors hover:border-cobalto/50"
                        >
                          Cadastrar
                        </Link>
                        <ProductRequestActions requestId={pedido.id} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {!products || products.length === 0 ? (
              <EmptyState
                icon={Package}
                titulo="Nenhum produto cadastrado"
                descricao="Use o formulário ao lado pra colocar o primeiro item na prateleira da loja."
              />
            ) : (
              <Panel>
                <ul className="divide-y divide-cobalto/10">
                  {products.map((product) => (
                    <li key={product.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-cobalto/10">
                        {product.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- URL arbitrária cadastrada pelo admin, fora dos remotePatterns
                          <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-5 w-5 text-cobalto/25" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 basis-48">
                        <p className="truncate font-medium text-tinta">{product.name}</p>
                        {product.description && (
                          <p className="mt-0.5 truncate text-xs text-tinta-suave/70">{product.description}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <p className="text-sm font-semibold tabular-nums text-tinta">
                          {formatCurrency(product.price)}
                        </p>
                        {/* Estoque zerado bloqueia a compra no checkout, então
                            precisa ser visível na lista, não só no formulário. */}
                        {product.stock > 0 ? (
                          <p className="text-xs tabular-nums text-tinta-suave/70">{product.stock} em estoque</p>
                        ) : (
                          <Badge variant="destructive">Sem estoque</Badge>
                        )}
                        {!product.is_active && <Badge variant="neutral">Inativo</Badge>}
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            <Pagination page={page} totalPages={totalPages} buildHref={(p) => `/admin/produtos?page=${p}`} />
          </div>
        </div>
      </PageBody>
    </>
  )
}
