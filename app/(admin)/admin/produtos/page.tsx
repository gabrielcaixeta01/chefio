import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { ProductForm } from '@/components/admin/ProductForm'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel } from '@/components/ui/panel'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { Package } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Produtos' }

const PAGE_SIZE = 20

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()

  const { data: products, count } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

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
            <ProductForm />
          </div>

          <div className="lg:order-1 lg:col-span-2">
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
