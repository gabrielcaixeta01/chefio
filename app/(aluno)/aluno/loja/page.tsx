import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { AddToCartButton } from '@/components/store/AddToCartButton'
import { CartButton } from '@/components/store/CartDrawer'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { EmptyState } from '@/components/ui/empty-state'
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
    <>
      <PageHeader
        olho="Loja"
        titulo="Do vídeo para a bancada"
        descricao="Os utensílios e ingredientes que os chefs usam nas aulas. Entregamos em todo o Brasil — o frete é calculado pelo seu CEP no carrinho."
        acoes={<CartButton />}
      />

      <PageBody>
        {!products || products.length === 0 ? (
          <EmptyState
            icon={Package}
            titulo="A prateleira está sendo montada"
            descricao="Os primeiros produtos entram em breve. Enquanto isso, siga assistindo às aulas."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-col overflow-hidden rounded-md border border-cobalto/15 bg-cal transition-all duration-200 hover:-translate-y-1 hover:border-cobalto/50"
              >
                <div className="relative aspect-square overflow-hidden bg-cal-fundo">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="h-16 w-16 text-cobalto/15" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-display text-base font-bold tracking-tight text-tinta">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-tinta-suave">
                      {product.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                    <span className="font-display text-lg font-extrabold tabular-nums tracking-tight text-tinta">
                      {formatCurrency(product.price)}
                    </span>
                    <AddToCartButton product={product} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} buildHref={(p) => `/aluno/loja?page=${p}`} />
      </PageBody>
    </>
  )
}
