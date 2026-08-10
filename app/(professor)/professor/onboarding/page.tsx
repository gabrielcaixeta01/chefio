import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { StripeOnboardingButton } from '@/components/stripe/StripeOnboardingButton'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel } from '@/components/ui/panel'
import { CheckCircle, AlertCircle } from 'lucide-react'

export const metadata: Metadata = { title: 'Configurar Recebimentos' }

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: teacherProfile } = await supabase
    .from('teacher_profiles')
    .select('stripe_account_id, status')
    .eq('user_id', user!.id)
    .maybeSingle()

  const isConnected = !!teacherProfile?.stripe_account_id
  const isActive = teacherProfile?.status === 'active'

  return (
    <>
      <PageHeader
        olho="Recebimentos"
        titulo="Configurar recebimentos"
        descricao="Para publicar cursos pagos e receber pagamentos, conecte sua conta Stripe."
      />

      <PageBody className="max-w-2xl">
        {params.success && (
          <Panel className="mb-6 flex items-center gap-3 border-emerald-200 bg-emerald-50/80 p-4">
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm text-emerald-800">
              {isActive
                ? 'Conta conectada com sucesso! Você já pode publicar cursos pagos.'
                : 'Conta vinculada. Complete o cadastro no Stripe para ativar os pagamentos.'}
            </p>
          </Panel>
        )}

        {params.error && (
          <Panel className="mb-6 flex items-center gap-3 border-red-200 bg-red-50/80 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <p className="text-sm text-red-800">
              {params.error === 'stripe_not_configured'
                ? 'Stripe não está configurado neste ambiente.'
                : 'Ocorreu um erro. Tente novamente.'}
            </p>
          </Panel>
        )}

        <Panel className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight text-tinta">Stripe Express</h2>
              <p className="mt-1 text-sm text-tinta-suave">
                Receba pagamentos diretamente na sua conta bancária via Stripe.
              </p>
            </div>
            <span className={`rounded-sm px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] ${
              isActive ? 'bg-emerald-50 text-emerald-700' :
              isConnected ? 'bg-amber-50 text-amber-800' :
              'bg-cobalto/10 text-tinta-suave'
            }`}>
              {isActive ? 'Ativo' : isConnected ? 'Pendente' : 'Não conectado'}
            </span>
          </div>

          <ul className="mt-4 space-y-2 text-sm text-tinta-suave">
            {[
              'Split automático: você recebe sua parte instantaneamente',
              'Suporte a PIX, cartão de crédito e boleto',
              'Dashboard financeiro completo no Stripe',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <StripeOnboardingButton isConnected={isConnected} isActive={isActive} />
          </div>
        </Panel>

        <Panel className="mt-6 border-amber-200 bg-amber-50/80 p-4">
          <p className="text-sm font-medium text-amber-800">Sobre as comissões</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-700">
            A plataforma retém uma comissão por cada venda (padrão 20%). Você define o preço dos seus cursos livremente e recebe o valor líquido automaticamente após cada compra.
          </p>
        </Panel>
      </PageBody>
    </>
  )
}
