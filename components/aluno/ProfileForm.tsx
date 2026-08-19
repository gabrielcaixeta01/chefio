'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Panel, SectionHeading } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/ui/notice'
import { User } from 'lucide-react'

interface ProfileFormProps {
  userId: string
  email: string
  nome: string
  avatarUrl: string | null
  marketingOptIn: boolean
}

/**
 * Decisões 7.4 e 7.5. Três blocos independentes de propósito: trocar a foto
 * não pode depender de acertar a senha, e a troca de e-mail tem consequência
 * (confirmação no endereço novo) que os outros dois não têm.
 */
export function ProfileForm({ userId, email, nome, avatarUrl, marketingOptIn }: ProfileFormProps) {
  const router = useRouter()

  const [dados, setDados] = useState({ nome })
  const [avatar, setAvatar] = useState(avatarUrl)
  const [salvandoDados, setSalvandoDados] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const inputFoto = useRef<HTMLInputElement>(null)

  const [novoEmail, setNovoEmail] = useState(email)
  const [salvandoEmail, setSalvandoEmail] = useState(false)
  const [emailPendente, setEmailPendente] = useState<string | null>(null)

  const [senha, setSenha] = useState({ nova: '', confirmar: '' })
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  const [marketing, setMarketing] = useState(marketingOptIn)
  const [salvandoMarketing, setSalvandoMarketing] = useState(false)

  async function salvarDados(e: React.FormEvent) {
    e.preventDefault()
    if (!dados.nome.trim()) {
      toast.error('O nome não pode ficar em branco.')
      return
    }

    setSalvandoDados(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ name: dados.nome.trim() })
      .eq('id', userId)

    if (error) toast.error('Não foi possível salvar o nome.')
    else {
      toast.success('Nome atualizado.')
      router.refresh()
    }
    setSalvandoDados(false)
  }

  async function trocarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return

    if (!arquivo.type.startsWith('image/')) {
      toast.error('Escolha um arquivo de imagem.')
      return
    }
    if (arquivo.size > 2 * 1024 * 1024) {
      toast.error('A foto precisa ter menos de 2 MB.')
      return
    }

    setEnviandoFoto(true)
    const supabase = createClient()
    // A policy do bucket `avatars` (00008) exige que a primeira pasta seja o
    // id de quem envia — sem isso o upload volta como "not authorized".
    const caminho = `${userId}/${Date.now()}-${arquivo.name.replace(/[^\w.-]/g, '')}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(caminho, arquivo, { upsert: true })

    if (uploadError) {
      toast.error('Não foi possível enviar a foto.')
      setEnviandoFoto(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(caminho)
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: data.publicUrl })
      .eq('id', userId)

    if (error) toast.error('A foto subiu, mas não foi possível salvar no perfil.')
    else {
      setAvatar(data.publicUrl)
      toast.success('Foto atualizada.')
      router.refresh()
    }
    setEnviandoFoto(false)
  }

  async function salvarEmail(e: React.FormEvent) {
    e.preventDefault()
    const alvo = novoEmail.trim()
    if (!alvo || alvo === email) return

    setSalvandoEmail(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser(
      { email: alvo },
      { emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/aluno/perfil` }
    )

    if (error) toast.error(error.message)
    else {
      // O e-mail só troca de verdade depois do clique no link — dizer
      // "atualizado" aqui faria a pessoa achar que já pode logar com o novo.
      setEmailPendente(alvo)
      toast.success('Confirme pelo link que enviamos no endereço novo.')
    }
    setSalvandoEmail(false)
  }

  async function salvarSenha(e: React.FormEvent) {
    e.preventDefault()
    if (senha.nova.length < 6) {
      toast.error('A senha precisa de pelo menos 6 caracteres.')
      return
    }
    if (senha.nova !== senha.confirmar) {
      toast.error('As senhas não coincidem.')
      return
    }

    setSalvandoSenha(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: senha.nova })

    if (error) toast.error(error.message)
    else {
      setSenha({ nova: '', confirmar: '' })
      toast.success('Senha alterada.')
    }
    setSalvandoSenha(false)
  }

  async function alternarMarketing(valor: boolean) {
    setSalvandoMarketing(true)
    setMarketing(valor)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ marketing_opt_in: valor })
      .eq('id', userId)

    if (error) {
      setMarketing(!valor)
      toast.error('Não foi possível salvar a preferência.')
    } else {
      toast.success(valor ? 'Você voltou a receber nossos e-mails.' : 'Pronto, sem mais e-mails de novidades.')
      router.refresh()
    }
    setSalvandoMarketing(false)
  }

  return (
    <div className="space-y-6">
      {/* ---------- Nome e foto ---------- */}
      <Panel className="p-5">
        <SectionHeading titulo="Seus dados" />

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cobalto/10">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- avatar vem do storage público
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-7 w-7 text-cobalto/40" aria-hidden="true" />
            )}
          </div>
          <div>
            <input
              ref={inputFoto}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={trocarFoto}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              loading={enviandoFoto}
              loadingText="Enviando…"
              onClick={() => inputFoto.current?.click()}
            >
              {avatar ? 'Trocar foto' : 'Adicionar foto'}
            </Button>
            <p className="mt-1.5 text-xs text-tinta-suave/70">JPG ou PNG, até 2 MB.</p>
          </div>
        </div>

        <form onSubmit={salvarDados} className="mt-6 flex flex-col gap-2">
          <Label htmlFor="perfil-nome">Nome</Label>
          <Input
            id="perfil-nome"
            value={dados.nome}
            onChange={(e) => setDados({ nome: e.target.value })}
            autoComplete="name"
            required
          />
          <div className="mt-2">
            <Button type="submit" size="sm" loading={salvandoDados} loadingText="Salvando…">
              Salvar nome
            </Button>
          </div>
        </form>
      </Panel>

      {/* ---------- E-mail ---------- */}
      <Panel className="p-5">
        <SectionHeading titulo="E-mail de acesso" />

        {emailPendente && (
          <Notice tipo="info" className="mb-4" titulo="Confirmação pendente">
            Enviamos um link para <strong>{emailPendente}</strong>. Até você abrir esse link, o
            login continua sendo com <strong>{email}</strong>.
          </Notice>
        )}

        <form onSubmit={salvarEmail} className="flex flex-col gap-2">
          <Label htmlFor="perfil-email">E-mail</Label>
          <Input
            id="perfil-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={novoEmail}
            onChange={(e) => setNovoEmail(e.target.value)}
            required
          />
          <p className="text-xs text-tinta-suave/70">
            Trocar o e-mail exige confirmar pelo endereço novo — é o que impede alguém com sua
            sessão aberta de tomar a conta.
          </p>
          <div className="mt-2">
            <Button
              type="submit"
              size="sm"
              loading={salvandoEmail}
              loadingText="Enviando…"
              disabled={novoEmail.trim() === email}
            >
              Trocar e-mail
            </Button>
          </div>
        </form>
      </Panel>

      {/* ---------- Senha ---------- */}
      <Panel className="p-5">
        <SectionHeading titulo="Senha" />

        <form onSubmit={salvarSenha} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="perfil-senha">Nova senha</Label>
            <Input
              id="perfil-senha"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              value={senha.nova}
              onChange={(e) => setSenha({ ...senha, nova: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="perfil-senha-confirmar">Confirmar nova senha</Label>
            <Input
              id="perfil-senha-confirmar"
              type="password"
              autoComplete="new-password"
              placeholder="Repita a senha"
              value={senha.confirmar}
              onChange={(e) => setSenha({ ...senha, confirmar: e.target.value })}
            />
          </div>
          <div>
            <Button
              type="submit"
              size="sm"
              loading={salvandoSenha}
              loadingText="Salvando…"
              disabled={!senha.nova}
            >
              Alterar senha
            </Button>
          </div>
        </form>
      </Panel>

      {/* ---------- Marketing (7.5) ---------- */}
      <Panel className="p-5">
        <SectionHeading titulo="Comunicação" />

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={marketing}
            disabled={salvandoMarketing}
            onChange={(e) => alternarMarketing(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-cobalto"
          />
          <span>
            <span className="block text-sm font-semibold text-tinta">
              Quero receber novidades da Chefio
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-tinta-suave">
              Cursos novos, chefs que entraram no catálogo e ofertas. Desmarcar aqui vale na hora
              e não afeta os e-mails da sua conta — confirmação de compra, reembolso e recuperação
              de senha continuam chegando.
            </span>
          </span>
        </label>
      </Panel>
    </div>
  )
}
