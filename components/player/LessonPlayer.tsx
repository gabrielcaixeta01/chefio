'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { marcarAulaConcluida } from '@/lib/actions/progress'
import { VideoPlayer } from '@/components/player/VideoPlayer'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

interface LessonPlayerProps {
  lessonId: string
  courseSlug: string
  isCompleted: boolean
  startAt: number
  nextLesson?: { id: string; title: string } | null
}

const SEGUNDOS_PARA_PROXIMA = 6
/** A partir daqui a aula conta como assistida, mesmo que a pessoa feche antes dos créditos. */
const FRACAO_CONCLUIDA = 0.95

/**
 * O vídeo da aula do aluno: o player + o que acontece em volta dele.
 *
 *  - ao assistir (quase) até o fim a aula é marcada como concluída sozinha —
 *    o botão "Marcar como concluída" continua existindo, mas deixou de ser
 *    obrigatório;
 *  - ao terminar, a próxima aula começa em alguns segundos, com contagem e
 *    botão de cancelar, como numa série.
 */
export function LessonPlayer({ lessonId, courseSlug, isCompleted, startAt, nextLesson }: LessonPlayerProps) {
  const router = useRouter()
  const [concluida, setConcluida] = useState(isCompleted)
  const [contagem, setContagem] = useState<number | null>(null)
  const marcando = useRef(false)

  // Trocar de aula reaproveita este componente (mesma rota, outro param).
  useEffect(() => {
    setConcluida(isCompleted)
    setContagem(null)
    marcando.current = false
    // Só o id: `isCompleted` muda sozinho quando a própria aula é concluída
    // (a action revalida a página), e zerar a contagem aqui a cancelaria.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId])

  const concluir = useCallback(async () => {
    if (concluida || marcando.current) return
    marcando.current = true
    const { erro } = await marcarAulaConcluida(lessonId)
    if (erro) {
      // Deixa tentar de novo no próximo marco (ou no fim do vídeo).
      marcando.current = false
      return
    }
    setConcluida(true)
    toast.success('Aula concluída!')
  }, [concluida, lessonId])

  const aoProgredir = useCallback(
    (fracao: number) => {
      if (fracao >= FRACAO_CONCLUIDA) void concluir()
    },
    [concluir]
  )

  const aoTerminar = useCallback(() => {
    void concluir()
    if (nextLesson) setContagem(SEGUNDOS_PARA_PROXIMA)
  }, [concluir, nextLesson])

  const irParaProxima = useCallback(() => {
    if (nextLesson) router.push(`/aluno/cursos/${courseSlug}/aulas/${nextLesson.id}`)
  }, [router, courseSlug, nextLesson])

  useEffect(() => {
    if (contagem === null) return
    if (contagem <= 0) {
      irParaProxima()
      return
    }
    const t = setTimeout(() => setContagem((c) => (c === null ? c : c - 1)), 1000)
    return () => clearTimeout(t)
  }, [contagem, irParaProxima])

  return (
    <div className="relative">
      <VideoPlayer
        lessonId={lessonId}
        startAt={concluida ? 0 : startAt}
        salvarPosicao
        onProgress={aoProgredir}
        onEnded={aoTerminar}
      />

      {contagem !== null && nextLesson && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-md bg-cobalto-escuro/90 p-4 text-center text-white"
          role="status"
        >
          <div className="max-w-sm">
            <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-400" aria-hidden="true" />
            <p className="text-xs uppercase tracking-wider text-white/60">Próxima aula em {contagem}s</p>
            <p className="mt-1 line-clamp-2 font-display text-lg font-bold">{nextLesson.title}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button size="sm" onClick={irParaProxima}>
                Ir agora
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white/80 hover:bg-white/10 hover:text-white"
                onClick={() => setContagem(null)}
              >
                Ficar nesta aula
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
