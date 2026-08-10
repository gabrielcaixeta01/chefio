'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { AuthField } from './AuthField'
import { actionLinkVariants } from '@/components/ui/action-link'
import { cn } from '@/lib/utils'

const DESTINOS: Record<string, string> = {
  admin: '/admin',
  teacher: '/professor',
  student: '/aluno',
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [form, setForm] = useState({ email: '', password: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro(null)

    try {
      // createClient() lança quando as NEXT_PUBLIC_* faltaram no build do
      // deploy — fora do try isso travava o botão em "Entrando…" para sempre.
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })

      if (error) {
        setErro('Email ou senha incorretos.')
        toast.error('Email ou senha incorretos.')
        setLoading(false)
        return
      }

      if (!data.user) {
        // Sem isso o botão fica travado em "Entrando..." para sempre
        setErro('Não foi possível abrir a sessão. Tente de novo.')
        setLoading(false)
        return
      }

      // O login emite um token novo, já com o role atual em app_metadata
      // (sincronizado via trigger — ver 00005_role_jwt_sync.sql). Sem SELECT
      // em profiles.
      const role = data.user.app_metadata?.role as string | undefined

      // `next` vem do middleware quando ele barra uma rota protegida — sem isso
      // a pessoa cai sempre no dashboard, e não na página que tentou abrir.
      router.push(next ?? DESTINOS[role ?? 'student'])
      router.refresh()
    } catch (err: any) {
      setErro(err?.message ?? 'Não foi possível entrar. Tente de novo.')
      toast.error(err?.message ?? 'Não foi possível entrar.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="olho text-brasa-escura">Entrar</p>
      <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.02em] text-tinta">
        Bem-vindo de volta.
      </h1>
      <p className="mt-3 text-tinta-suave">
        Entre para continuar de onde você parou.
      </p>

      <div className="mt-9 flex flex-col gap-5">
        <AuthField
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="seu@email.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />

        <AuthField
          label="Senha"
          type="password"
          autoComplete="current-password"
          placeholder="Sua senha"
          revelavel
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        {erro && (
          <p
            role="alert"
            className="rounded-sm border-2 border-red-600/30 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
          >
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={cn(
            actionLinkVariants({ size: 'lg' }),
            'w-full disabled:pointer-events-none disabled:opacity-60'
          )}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </div>

      <p className="mt-7 text-center text-sm text-tinta-suave">
        Não tem conta?{' '}
        <Link
          href="/cadastro"
          className="font-semibold text-cobalto underline-offset-4 hover:underline"
        >
          Criar conta grátis
        </Link>
      </p>
    </form>
  )
}
