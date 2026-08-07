import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { ProductForm } from '@/components/admin/ProductForm'
import { Pagination } from '@/components/ui/pagination'
import { Package, Plus } from 'lucide-react'

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-tinta tracking-tight">Produtos</h1>
          <p className="text-tinta-suave mt-1">{count ?? 0} produto(s) cadastrado(s)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista */}
        <div className="lg:col-span-2">
          {!products || products.length === 0 ? (
            <div className="bg-cal rounded-md border border-cobalto/15 p-16 text-center">
              <Package className="h-10 w-10 text-cobalto/25 mx-auto mb-3" />
              <p className="text-tinta-suave/70 text-sm">Nenhum produto cadastrado.</p>
              <p className="text-tinta-suave/70 text-xs mt-1">Adicione produtos usando o formulário ao lado.</p>
            </div>
          ) : (
            <div className="bg-cal rounded-md border border-cobalto/15 divide-y divide-cobalto/10">
              {products.map((product) => (
                <div key={product.id} className="flex items-center gap-4 p-4">
                  <div className="w-12 h-12 rounded-sm bg-cobalto/10 shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-5 w-5 text-cobalto/25" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-tinta truncate">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-tinta-suave/70 truncate mt-0.5">{product.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-brasa-escura text-sm">{formatCurrency(product.price)}</p>
                    {!product.is_active && (
                      <span className="text-xs text-tinta-suave/70">Inativo</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} buildHref={(p) => `/admin/produtos?page=${p}`} />
        </div>

        {/* Formulário */}
        <div className="lg:col-span-1">
          <ProductForm />
        </div>
      </div>
    </div>
  )
}
