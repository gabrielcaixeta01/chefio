'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuthField } from './AuthField'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'

/**
 * Decisão 7.3. Até aqui não existia recuperação de senha: quem esquecia
 * perdia a conta e tudo que tinha comprado — e o acesso vitalício da 3.1 não
 * vale nada se a porta não abre.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setErro('Informe o e-mail da sua conta.')
      return
    }

    setLoading(true)
    setErro(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/redefinir-senha`,
      })

      // Erro do Supabase aqui é de infra (limite de envio, e-mail mal
      // formado). "E-mail não cadastrado" nunca aparece de propósito — é o
      // que transformaria esta tela num verificador de quem tem conta aqui.
      if (error) {
        setErro('Não foi possível enviar agora. Tente de novo em alguns minutos.')
        setLoading(false)
        return
      }

      setEnviado(true)
    } catch {
      setErro('Não foi possível enviar agora. Tente de novo em alguns minutos.')
      setLoading(false)
    }
  }

  if (enviado) {
    return (
      <div>
        <span
          aria-hidden="true"
          className="azulejo-escuro flex h-14 w-14 items-center justify-center rounded-sm [--azulejo-tamanho:56px]"
        >
          <MailCheck className="h-6 w-6 text-brasa" />
        </span>
        <h1 className="mt-7 font-display text-4xl font-extrabold tracking-[-0.02em] text-tinta">
          Verifique seu e-mail.
        </h1>
        <p className="mt-4 leading-relaxed text-tinta-suave">
          Se existe uma conta com{' '}
          <strong className="font-semibold text-tinta">{email.trim()}</strong>, o link de
          redefinição já saiu. Ele vale por uma hora e só pode ser usado uma vez.
        </p>
        <p className="mt-4 leading-relaxed text-tinta-suave">
          Não chegou? Confira a caixa de spam antes de pedir outro — cada pedido novo invalida o
          link anterior.
        </p>
        <p className="mt-8 text-sm text-tinta-suave">
          <Link
            href="/login"
            className="font-semibold text-cobalto underline-offset-4 hover:underline"
          >
            Voltar para o login
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="olho text-brasa-escura">Recuperar acesso</p>
      <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.02em] text-tinta">
        Esqueceu a senha?
      </h1>
      <p className="mt-3 text-tinta-suave">
        Informe o e-mail da conta e mandamos um link para você criar uma nova.
      </p>

      <div className="mt-9 flex flex-col gap-5">
        <AuthField
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="seu@email.com"
          erro={erro ?? undefined}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {erro && (
          <Notice tipo="erro" role="alert">
            {erro}
          </Notice>
        )}

        <Button type="submit" size="lg" className="w-full" loading={loading} loadingText="Enviando…">
          Enviar link de redefinição
        </Button>
      </div>

      <p className="mt-7 text-center text-sm text-tinta-suave">
        Lembrou?{' '}
        <Link href="/login" className="font-semibold text-cobalto underline-offset-4 hover:underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  )
}
