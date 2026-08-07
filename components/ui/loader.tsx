import { cn } from '@/lib/utils'

/* Vocabulário de carregamento do Chefio.
   Tudo aqui é CSS puro (sem estado, sem hook) pra poder ser usado dentro de
   `loading.tsx` — que roda no servidor — sem virar client component. */

const TAMANHOS = {
  sm: { caixa: 'h-6 w-6', vao: 'gap-[2px]', raio: 'rounded-[1.5px]' },
  md: { caixa: 'h-12 w-12', vao: 'gap-[3px]', raio: 'rounded-[2px]' },
  lg: { caixa: 'h-20 w-20', vao: 'gap-1', raio: 'rounded-[3px]' },
} as const

export type LoaderSize = keyof typeof TAMANHOS

/**
 * A parede de azulejo sendo assentada: 3×3 ladrilhos que acendem numa onda
 * diagonal. O atraso de cada ladrilho vem da distância até o canto superior
 * esquerdo, então a onda sempre viaja no mesmo sentido — é a direção que faz
 * o olho ler "progredindo" em vez de "parado piscando".
 */
export function AzulejoLoader({
  size = 'md',
  className,
}: {
  size?: LoaderSize
  className?: string
}) {
  const t = TAMANHOS[size]

  return (
    <div
      className={cn('grid grid-cols-3', t.caixa, t.vao, className)}
      role="presentation"
      aria-hidden="true"
    >
      {Array.from({ length: 9 }, (_, i) => {
        const linha = Math.floor(i / 3)
        const coluna = i % 3
        // Diagonal: 0,1,2,3,4 → cinco frentes de onda em 9 ladrilhos.
        const passo = linha + coluna
        return (
          <span
            key={i}
            className={cn('ladrilho-assentando block w-full', t.raio)}
            style={{ animationDelay: `${passo * 110}ms` }}
          />
        )
      })}
    </div>
  )
}

/**
 * Arco girando, para quando não há espaço para a parede — dentro de botões,
 * ícones e linhas de tabela.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4 animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        className="opacity-20"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Trilho de cobalto com um cometa de brasa correndo dentro. Usado embaixo do
 * loader e em qualquer operação sem porcentagem conhecida.
 */
export function IndeterminateBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative h-1 w-full overflow-hidden rounded-full bg-cobalto/12',
        className
      )}
      aria-hidden="true"
    >
      <span className="barra-correndo absolute inset-y-0 left-0 w-1/3 origin-left rounded-full bg-brasa" />
    </div>
  )
}

/**
 * Bloco de carregamento em fluxo: entra dentro do layout que já está na tela
 * (com sidebar, navbar etc.). É o padrão dos `loading.tsx` de página.
 */
export function PageLoader({
  label = 'Carregando',
  hint,
  className,
}: {
  label?: string
  hint?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-[45vh] flex-col items-center justify-center gap-5 py-16',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <AzulejoLoader size="md" />
      <div className="flex flex-col items-center gap-3">
        <p className="olho respirando text-cobalto">{label}</p>
        {hint && <p className="text-sm text-tinta-suave">{hint}</p>}
      </div>
      <IndeterminateBar className="w-40" />
    </div>
  )
}

/**
 * Tela cheia sobre a parede de azulejo. Usada na borda do app (boot) e nas
 * trocas de área autenticada, onde ainda não existe layout para preencher.
 */
export function LoadingScreen({
  label = 'Preparando tudo',
  hint,
}: {
  label?: string
  hint?: string
}) {
  return (
    <div
      className="azulejo-claro fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 px-6"
      role="status"
      aria-live="polite"
    >
      {/* Cartão de cal por cima do padrão: o ladrilhado fica como textura de
          fundo, não compete com o loader. */}
      <div className="flex flex-col items-center gap-7 rounded-md border border-cobalto/15 bg-cal px-12 py-11 shadow-[0_18px_50px_-30px_rgba(18,56,107,0.55)]">
        <AzulejoLoader size="lg" />

        <div className="flex flex-col items-center gap-2 text-center">
          <p className="font-display text-lg font-bold tracking-tight text-tinta">
            {label}
          </p>
          <p className="text-sm text-tinta-suave respirando">
            {hint ?? 'Um instante — estamos montando sua cozinha.'}
          </p>
        </div>

        <IndeterminateBar className="w-52" />
      </div>
    </div>
  )
}
