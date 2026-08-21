'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ChefHat, GraduationCap, MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuthField } from './AuthField'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Role = 'student' | 'teacher'

const PAPEIS: Array<{ valor: Role; label: string; desc: string; icone: typeof ChefHat }> = [
  { valor: 'student', label: 'Aluno', desc: 'Quero aprender', icone: GraduationCap },
  { valor: 'teacher', label: 'Professor', desc: 'Quero ensinar', icone: ChefHat },
]

type Erros = Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', string>>

export function RegisterForm({ papelInicial = 'student' }: { papelInicial?: Role }) {
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<Role>(papelInicial)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [erros, setErros] = useState<Erros>({})
  const [done, setDone] = useState(false)
  // Separado de `erros.email` porque muda o que a tela OFERECE, não só o que
  // ela diz: com o e-mail em uso as duas saídas (login e recuperar senha)
  // aparecem logo abaixo do campo, sem obrigar a pessoa a caçar no rodapé.
  const [emailEmUso, setEmailEmUso] = useState(false)

  function validar(): Erros {
    const e: Erros = {}
    if (!form.name.trim()) e.name = 'Informe seu nome.'
    if (!form.email.trim()) e.email = 'Informe seu email.'
    if (form.password.length < 6) e.password = 'A senha precisa de pelo menos 6 caracteres.'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'As senhas não coincidem.'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const encontrados = validar()
    setErros(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setLoading(true)

    try {
      // createClient() lança quando as NEXT_PUBLIC_* faltaram no build do
      // deploy. Fora do try, essa exceção deixava o botão preso em
      // "Criando conta…" para sempre: sem erro na tela e sem como tentar
      // de novo, porque o setLoading(false) nunca chegava a rodar.
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { name: form.name, role },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (error) {
        toast.error(error.message)
        setErros({ email: error.message })
        setLoading(false)
        return
      }

      // E-mail já cadastrado NÃO vem como erro. Com a confirmação por e-mail
      // ligada, o GoTrue devolve sucesso e um usuário obfuscado — `identities`
      // vazio — para não deixar ninguém varrer a base descobrindo quem tem
      // conta. O preço disso era a pessoa cair na tela "Confirme seu email" e
      // esperar para sempre um e-mail que nunca ia chegar.
      //
      // Optamos por avisar. Sim, isso permite confirmar se um e-mail tem
      // conta aqui — mas o /login e o "esqueci minha senha" já respondem a
      // mesma pergunta, então o silêncio no cadastro só atrapalhava quem é
      // dono do endereço.
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        const aviso = 'Este email já tem conta na Chefio. Faça login ou use "Esqueci minha senha".'
        toast.error(aviso)
        setErros({ email: aviso })
        setEmailEmUso(true)
        setLoading(false)
        return
      }

      setDone(true)
    } catch (err: any) {
      toast.error(err?.message ?? 'Não foi possível criar a conta.')
      setErros({ email: err?.message ?? 'Não foi possível criar a conta.' })
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div>
        <span
          aria-hidden="true"
          className="azulejo-escuro flex h-14 w-14 items-center justify-center rounded-sm [--azulejo-tamanho:56px]"
        >
          <MailCheck className="h-6 w-6 text-brasa" />
        </span>
        <h1 className="mt-7 font-display text-4xl font-extrabold tracking-[-0.02em] text-tinta">
          Confirme seu email.
        </h1>
        <p className="mt-4 leading-relaxed text-tinta-suave">
          Enviamos um link de confirmação para{' '}
          <strong className="font-semibold text-tinta">{form.email}</strong>.
          Abra o link para ativar sua conta — sem isso o login não funciona.
        </p>
        {/* Decisão 4.2: quem pede pra ensinar entra como aluno e só vira
            professor depois de enviar a candidatura e um admin aprovar. Dizer
            isso aqui evita a pergunta "cadastrei como chef, cadê meu painel?". */}
        {role === 'teacher' && (
          <p className="mt-4 leading-relaxed text-tinta-suave">
            Depois de confirmar, preencha sua candidatura em{' '}
            <strong className="font-semibold text-tinta">Quero ensinar</strong>: precisamos de
            documento, contato e um resumo da sua experiência para liberar a publicação de cursos.
            Até lá sua conta funciona normalmente como aluno.
          </p>
        )}
        <p className="mt-8 text-sm text-tinta-suave">
          Já confirmou?{' '}
          <Link
            href="/login"
            className="font-semibold text-cobalto underline-offset-4 hover:underline"
          >
            Ir para o login
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="olho text-brasa-escura">Criar conta</p>
      <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.02em] text-tinta">
        Comece a cozinhar.
      </h1>
      <p className="mt-3 text-tinta-suave">
        Leva um minuto. Você escolhe se vem aprender ou ensinar.
      </p>

      <div className="mt-9 flex flex-col gap-5">
        {/* Radios de verdade: dão navegação por setas de graça */}
        <fieldset>
          <legend className="text-sm font-semibold text-tinta">
            Quero me cadastrar como
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {PAPEIS.map((papel) => {
              const Icone = papel.icone
              const ativo = role === papel.valor
              return (
                <label
                  key={papel.valor}
                  className={cn(
                    'flex cursor-pointer flex-col gap-1 rounded-sm border-2 p-4 transition-colors',
                    'has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-brasa',
                    ativo
                      ? 'border-cobalto bg-cobalto text-cal'
                      : 'border-cobalto/20 text-tinta hover:border-cobalto/40'
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={papel.valor}
                    checked={ativo}
                    onChange={() => setRole(papel.valor)}
                    className="sr-only"
                  />
                  <Icone className="h-6 w-6" aria-hidden="true" />
                  <span className="mt-1 font-display text-lg font-bold tracking-tight">
                    {papel.label}
                  </span>
                  <span
                    className={cn(
                      'text-xs',
                      ativo ? 'text-cal/70' : 'text-tinta-suave'
                    )}
                  >
                    {papel.desc}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <AuthField
          label="Nome completo"
          autoComplete="name"
          placeholder="Seu nome"
          erro={erros.name}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <AuthField
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="seu@email.com"
          erro={erros.email}
          value={form.email}
          onChange={(e) => {
            setForm({ ...form, email: e.target.value })
            if (emailEmUso) setEmailEmUso(false)
          }}
          required
        />

        {emailEmUso && (
          <div className="-mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link
              href={`/login?email=${encodeURIComponent(form.email)}`}
              className="font-semibold text-cobalto underline-offset-4 hover:underline"
            >
              Fazer login
            </Link>
            <Link
              href={`/esqueci-senha?email=${encodeURIComponent(form.email)}`}
              className="font-semibold text-cobalto underline-offset-4 hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
        )}

        <AuthField
          label="Senha"
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
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          placeholder="Repita a senha"
          revelavel
          erro={erros.confirmPassword}
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          required
        />

        <Button type="submit" size="lg" className="w-full" loading={loading} loadingText="Criando conta…">
          Criar conta
        </Button>

        {/* Decisão 7.5: pode mandar novidades, com descadastro. Avisar aqui é
            o que separa "comunicação combinada" de spam — e o link leva pro
            lugar onde se desmarca, não pra uma promessa vaga. */}
        <p className="text-center text-xs leading-relaxed text-tinta-suave/70">
          Ao criar a conta você passa a receber novidades da Chefio por e-mail. Dá pra desmarcar
          quando quiser em <strong className="font-semibold">Minha conta</strong>, sem perder os
          e-mails de compra e recuperação de senha.
        </p>
      </div>

      <p className="mt-7 text-center text-sm text-tinta-suave">
        Já tem conta?{' '}
        <Link
          href="/login"
          className="font-semibold text-cobalto underline-offset-4 hover:underline"
        >
          Fazer login
        </Link>
      </p>
    </form>
  )
}
