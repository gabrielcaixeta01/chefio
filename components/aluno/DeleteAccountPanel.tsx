'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Panel, SectionHeading } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/ui/notice'

const PALAVRA = 'EXCLUIR'

/**
 * Decisão 9.3: apagar a conta é direito do titular e tem que ser tão fácil
 * de achar quanto criar a conta — por isso mora na tela de perfil, e não
 * atrás de um pedido por e-mail.
 *
 * A confirmação é digitada, não um `confirm()`: é a única ação do sistema
 * que não tem desfazer, e clicar "OK" por reflexo é fácil demais.
 */
export function DeleteAccountPanel({ ehProfessor }: { ehProfessor: boolean }) {
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [excluindo, setExcluindo] = useState(false)

  async function excluir() {
    setExcluindo(true)
    try {
      const res = await fetch('/api/conta', { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.erro ?? 'Não foi possível excluir a conta.')
        setExcluindo(false)
        return
      }

      // `window.location`, e não router.push: a sessão acabou de ser
      // encerrada e o cache do App Router ainda acha que existe usuário.
      window.location.href = '/'
    } catch {
      toast.error('Não foi possível excluir a conta. Tente de novo.')
      setExcluindo(false)
    }
  }

  return (
    <Panel className="border-red-200 p-5">
      <SectionHeading titulo="Excluir minha conta" />

      <p className="text-sm leading-relaxed text-tinta-suave">
        Seus dados de cadastro, foto, anotações e progresso das aulas são apagados na hora, e o
        login deixa de funcionar. <strong className="font-semibold text-tinta">Não tem como desfazer</strong> —
        você perde o acesso aos cursos que comprou.
      </p>

      {/* Decisão 9.4: o registro da compra fica. Dizer isso antes é o que
          separa transparência de surpresa desagradável depois. */}
      <p className="mt-3 text-sm leading-relaxed text-tinta-suave">
        O registro das suas compras continua guardado sem o seu nome, porque nota fiscal tem prazo
        legal de guarda. Ele deixa de estar ligado a você.
      </p>

      {ehProfessor && (
        <Notice tipo="atencao" className="mt-4" titulo="Você tem cursos publicados">
          Seus cursos saem do catálogo e param de vender, mas quem já comprou continua assistindo —
          é a promessa de acesso vitalício que o aluno leu na hora da compra. Seu nome some das
          telas. Repasses já lançados continuam devidos e são acertados fora da plataforma.
        </Notice>
      )}

      {!aberto ? (
        <div className="mt-5">
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => setAberto(true)}
          >
            Excluir minha conta
          </Button>
        </div>
      ) : (
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4">
          <Label htmlFor="confirmar-exclusao" className="text-red-900">
            Digite {PALAVRA} para confirmar
          </Label>
          <Input
            id="confirmar-exclusao"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={PALAVRA}
            autoComplete="off"
            className="mt-2 max-w-48 border-red-200 bg-white"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={texto.trim().toUpperCase() !== PALAVRA}
              loading={excluindo}
              loadingText="Apagando…"
              onClick={excluir}
            >
              Apagar tudo agora
            </Button>
            <Button
              variant="outline"
              disabled={excluindo}
              onClick={() => {
                setAberto(false)
                setTexto('')
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </Panel>
  )
}
