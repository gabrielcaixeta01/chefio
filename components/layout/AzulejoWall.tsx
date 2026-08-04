import { cn } from '@/lib/utils'

/**
 * Parede de azulejo — o elemento-assinatura da marca.
 *
 * O padrão de fundo é puro gradiente (utility `azulejo-escuro`), e por cima
 * corre uma grade de 6x6 onde alguns ladrilhos aparecem "vidrados" em brasa.
 * As posições são fixas, não sorteadas: sorteio no servidor quebraria a
 * hidratação e faria o desenho mudar a cada request.
 *
 * Os vidrados acendem em cascata na diagonal, como a luz da cozinha batendo
 * na parede. `prefers-reduced-motion` desliga a animação em globals.css.
 */

const COLUNAS = 6
const LINHAS = 6

// [coluna, linha] — escolhidos para descer na diagonal sem virar padrão óbvio
const VIDRADOS: Array<[number, number]> = [
  [1, 0],
  [4, 1],
  [2, 2],
  [5, 3],
  [0, 3],
  [3, 4],
  [1, 5],
  [4, 5],
]

export function AzulejoWall({ className }: { className?: string }) {
  const vidrados = new Set(VIDRADOS.map(([c, l]) => `${c}-${l}`))

  return (
    <div
      aria-hidden="true"
      className={cn(
        'azulejo-escuro relative overflow-hidden',
        '[--azulejo-tamanho:56px] sm:[--azulejo-tamanho:72px]',
        className
      )}
    >
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${COLUNAS}, 1fr)`,
          gridTemplateRows: `repeat(${LINHAS}, 1fr)`,
        }}
      >
        {Array.from({ length: COLUNAS * LINHAS }, (_, i) => {
          const coluna = i % COLUNAS
          const linha = Math.floor(i / COLUNAS)
          if (!vidrados.has(`${coluna}-${linha}`)) return <div key={i} />

          return (
            <div key={i} className="relative p-[6%]">
              <div
                className="vidrado h-full w-full rounded-[3px] bg-brasa"
                style={{ animationDelay: `${240 + (coluna + linha) * 90}ms` }}
              >
                <div className="flex h-full w-full items-center justify-center">
                  <span className="block h-1.5 w-1.5 rounded-full bg-cobalto-escuro" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Vinheta: escurece as bordas para o painel não competir com o texto */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(10,31,60,0.55)_100%)]" />
    </div>
  )
}
