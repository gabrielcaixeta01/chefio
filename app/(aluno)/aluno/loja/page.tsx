import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { AddToCartButton } from '@/components/store/AddToCartButton'
import { CartButton } from '@/components/store/CartDrawer'
import { Pagination } from '@/components/ui/pagination'
import { Package } from 'lucide-react'

export const metadata: Metadata = { title: 'Loja Chefio' }

const PAGE_SIZE = 12

export default async function StorePagePage({
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
    .select('id, name, description, price, image_url', { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(from, to)

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-tinta">Loja</h1>
          <p className="text-tinta-suave mt-1">Utensílios e ingredientes para sua cozinha</p>
        </div>
        <CartButton />
      </div>

      {!products || products.length === 0 ? (
        <div className="bg-white rounded-md border border-cobalto/15 p-16 text-center">
          <Package className="h-12 w-12 text-cobalto/25 mx-auto mb-4" />
          <p className="text-tinta-suave font-medium">Nenhum produto disponível</p>
          <p className="text-tinta-suave/70 text-sm mt-1">Em breve novos produtos serão adicionados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-md border border-cobalto/15 overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-square bg-cal-fundo relative overflow-hidden">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package className="h-16 w-16 text-cobalto/15" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-tinta text-sm">{product.name}</h3>
                {product.description && (
                  <p className="text-xs text-tinta-suave mt-1 line-clamp-2">{product.description}</p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-brasa-escura font-bold">{formatCurrency(product.price)}</span>
                  <AddToCartButton product={product} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} buildHref={(p) => `/aluno/loja?page=${p}`} />
    </div>
  )
}
