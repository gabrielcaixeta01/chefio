import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { StripeOnboardingButton } from '@/components/stripe/StripeOnboardingButton'
import { PageHeader, PageBody } from '@/components/layout/PageShell'
import { Panel } from '@/components/ui/panel'
import { Notice } from '@/components/ui/notice'
import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'

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
          <Notice tipo="sucesso" className="mb-6">
            {isActive
              ? 'Conta conectada com sucesso! Você já pode publicar cursos pagos.'
              : 'Conta vinculada. Complete o cadastro no Stripe para ativar os pagamentos.'}
          </Notice>
        )}

        {params.error && (
          <Notice tipo="erro" className="mb-6">
            {params.error === 'stripe_not_configured'
              ? 'Stripe não está configurado neste ambiente.'
              : 'Ocorreu um erro. Tente novamente.'}
          </Notice>
        )}

        <Panel className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight text-tinta">Stripe Express</h2>
              <p className="mt-1 text-sm text-tinta-suave">
                Receba pagamentos diretamente na sua conta bancária via Stripe.
              </p>
            </div>
            <Badge variant={isActive ? 'success' : isConnected ? 'warning' : 'neutral'}>
              {isActive ? 'Ativo' : isConnected ? 'Pendente' : 'Não conectado'}
            </Badge>
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

        {/* Informação de contrato, não alerta: âmbar aqui competia com os
            avisos de erro logo acima e treinava o olho a ignorar amarelo. */}
        <Notice tipo="info" titulo="Sobre as comissões" className="mt-6">
          A plataforma retém uma comissão por cada venda (padrão 20%). Você define o preço dos seus
          cursos livremente e recebe o valor líquido automaticamente após cada compra.
        </Notice>
      </PageBody>
    </>
  )
}
