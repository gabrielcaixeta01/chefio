'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { AuthField } from './AuthField'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { AzulejoLoader } from '@/components/ui/loader'

const DESTINOS: Record<string, string> = {
  owner: '/admin',
  admin: '/admin',
  teacher: '/professor',
  student: '/aluno',
}

type Erros = Partial<Record<'password' | 'confirmPassword', string>>

/**
 * Decisão 7.3, segunda metade. O link do e-mail passa pelo
 * /api/auth/callback, que troca o código por uma sessão e manda pra cá — ou
 * seja, quem chega aqui já está logado. É por isso que a tela confere a
 * sessão antes de mostrar o formulário: sem ela, `updateUser` falharia só
 * depois da pessoa digitar a senha duas vezes.
 */
export function ResetPasswordForm() {
  const router = useRouter()
  const [checando, setChecando] = useState(true)
  const [temSessao, setTemSessao] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [erros, setErros] = useState<Erros>({})

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setChecando(false)
      return
    }
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setTemSessao(!!session)
      setChecando(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const encontrados: Erros = {}
    if (form.password.length < 6) encontrados.password = 'A senha precisa de pelo menos 6 caracteres.'
    if (form.password !== form.confirmPassword) encontrados.confirmPassword = 'As senhas não coincidem.'
    setErros(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.updateUser({ password: form.password })

      if (error) {
        toast.error(error.message)
        setErros({ password: error.message })
        setLoading(false)
        return
      }

      toast.success('Senha alterada. Bem-vindo de volta!')
      const role = data.user?.app_metadata?.role as string | undefined
      router.push(DESTINOS[role ?? 'student'])
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message ?? 'Não foi possível alterar a senha.')
      setLoading(false)
    }
  }

  if (checando) {
    return (
      <div className="flex justify-center py-16">
        <AzulejoLoader />
      </div>
    )
  }

  if (!temSessao) {
    return (
      <div>
        <p className="olho text-brasa-escura">Recuperar acesso</p>
        <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.02em] text-tinta">
          Link expirado.
        </h1>
        <Notice tipo="atencao" className="mt-6">
          O link de redefinição vale por uma hora e só funciona uma vez. Peça outro para continuar.
        </Notice>
        <p className="mt-8 text-sm text-tinta-suave">
          <Link
            href="/esqueci-senha"
            className="font-semibold text-cobalto underline-offset-4 hover:underline"
          >
            Pedir um link novo
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="olho text-brasa-escura">Recuperar acesso</p>
      <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.02em] text-tinta">
        Crie uma senha nova.
      </h1>
      <p className="mt-3 text-tinta-suave">
        Depois de salvar, use a senha nova para entrar em qualquer aparelho.
      </p>

      <div className="mt-9 flex flex-col gap-5">
        <AuthField
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          dica="Use pelo menos 6 caracteres."
          revelavel
          erro={erros.password}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        <AuthField
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          placeholder="Repita a senha"
          revelavel
          erro={erros.confirmPassword}
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          required
        />

        <Button type="submit" size="lg" className="w-full" loading={loading} loadingText="Salvando…">
          Salvar nova senha
        </Button>
      </div>
    </form>
  )
}
