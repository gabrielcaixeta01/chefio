import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel } from '@/components/ui/panel'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { CouponForm } from '@/components/admin/CouponForm'
import { CouponToggle } from '@/components/admin/CouponToggle'
import { Ticket } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin — Cupons' }

/** Cupom de desconto (decisão 2.6): criado só aqui, pela administração. */
export default async function AdminCouponsPage() {
  const supabase = await createClient()

  const [{ data: coupons }, { data: cursos }] = await Promise.all([
    supabase
      .from('coupons')
      .select('*, course:courses(title)')
      .order('created_at', { ascending: false }),
    supabase
      .from('courses')
      .select('id, title')
      .eq('status', 'approved')
      .is('archived_at', null)
      .order('title', { ascending: true }),
  ])

  return (
    <>
      <PageHeader
        olho="Administração"
        titulo="Cupons"
        descricao={`${coupons?.length ?? 0} ${coupons?.length === 1 ? 'cupom criado' : 'cupons criados'}`}
      />

      <PageBody>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            {!coupons || coupons.length === 0 ? (
              <EmptyState
                icon={Ticket}
                titulo="Nenhum cupom ainda"
                descricao="Crie um código ao lado e ele já vale no checkout dos cursos."
              />
            ) : (
              <Panel className="overflow-hidden">
                <ul className="divide-y divide-cobalto/10">
                  {coupons.map((c) => {
                    const expirado = c.expires_at ? new Date(c.expires_at) < new Date() : false
                    const esgotado = c.max_redemptions !== null && c.redemptions >= c.max_redemptions
                    return (
                      <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                        <div className="min-w-0 flex-1 basis-56">
                          <p className="flex items-center gap-2 text-sm font-semibold text-tinta">
                            <span className="font-mono tracking-wide">{c.code}</span>
                            <Badge variant="info">−{c.discount_percent}%</Badge>
                            {!c.active && <Badge variant="neutral">Desativado</Badge>}
                            {c.active && expirado && <Badge variant="destructive">Expirado</Badge>}
                            {c.active && !expirado && esgotado && <Badge variant="warning">Esgotado</Badge>}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-tinta-suave/70">
                            {(c.course as any)?.title ?? 'Todos os cursos'} · {c.redemptions}
                            {c.max_redemptions ? `/${c.max_redemptions}` : ''} usos
                            {c.expires_at && ` · até ${new Date(c.expires_at).toLocaleDateString('pt-BR')}`}
                          </p>
                        </div>
                        <CouponToggle couponId={c.id} active={c.active} />
                      </li>
                    )
                  })}
                </ul>
              </Panel>
            )}
          </div>

          <CouponForm cursos={cursos ?? []} />
        </div>
      </PageBody>
    </>
  )
}
