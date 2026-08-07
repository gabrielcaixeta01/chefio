import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { StripeOnboardingButton } from '@/components/stripe/StripeOnboardingButton'
import { CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'

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
    .single()

  const isConnected = !!teacherProfile?.stripe_account_id
  const isActive = teacherProfile?.status === 'active'

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-tinta mb-2">Configurar Recebimentos</h1>
      <p className="text-tinta-suave mb-8">
        Para publicar cursos pagos e receber pagamentos, conecte sua conta Stripe.
      </p>

      {params.success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 flex items-center gap-3 mb-6">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-emerald-800 text-sm">
            {isActive
              ? 'Conta conectada com sucesso! Você já pode publicar cursos pagos.'
              : 'Conta vinculada. Complete o cadastro no Stripe para ativar os pagamentos.'}
          </p>
        </div>
      )}

      {params.error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-3 mb-6">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-red-800 text-sm">
            {params.error === 'stripe_not_configured'
              ? 'Stripe não está configurado neste ambiente.'
              : 'Ocorreu um erro. Tente novamente.'}
          </p>
        </div>
      )}

      <div className="bg-white border border-cobalto/15 rounded-md p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-tinta">Stripe Express</h2>
            <p className="text-sm text-tinta-suave mt-1">
              Receba pagamentos diretamente na sua conta bancária via Stripe.
            </p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
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
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <StripeOnboardingButton isConnected={isConnected} isActive={isActive} />
        </div>
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-md p-4">
        <p className="text-amber-800 text-sm font-medium">Sobre as comissões</p>
        <p className="text-amber-700 text-xs mt-1">
          A plataforma retém uma comissão por cada venda (padrão 20%). Você define o preço dos seus cursos livremente e recebe o valor líquido automaticamente após cada compra.
        </p>
      </div>
    </div>
  )
}
