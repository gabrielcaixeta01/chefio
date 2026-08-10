import { cn } from '@/lib/utils'

/**
 * Ladrilho — o átomo da marca dentro do produto.
 *
 * É o mesmo quadrado de canto 3px que acende na parede do hero (AzulejoWall):
 * vidrado em brasa quando está "aceso", apagado quando não. Vazio, ele mostra
 * o ponto central do azulejo; com filho (ícone, iniciais, número), o ponto sai
 * e o conteúdo entra no lugar.
 *
 * Usar sempre este componente em vez de um quadrado solto: é ele que faz a
 * área logada falar a mesma língua da home.
 */

type Tom = 'vidrado' | 'apagado' | 'claro' | 'cobalto' | 'contorno'

const TONS: Record<Tom, { caixa: string; ponto: string }> = {
  // Aceso: o ladrilho de brasa da parede. Brasa é reservada pro "você está
  // aqui" e pra ação principal — se virar decoração, o estado ativo some.
  vidrado: { caixa: 'bg-brasa text-tinta', ponto: 'bg-cobalto-escuro' },
  // Cal sobre fundo escuro: o ladrilho da marca, quieto
  claro: { caixa: 'bg-cal text-cobalto-escuro', ponto: 'bg-cobalto' },
  // Apagado sobre fundo escuro (rail da sidebar)
  apagado: { caixa: 'bg-cal/10 text-cal/60', ponto: 'bg-cal/45' },
  // Sobre fundo claro (cards, estados vazios)
  cobalto: { caixa: 'bg-cobalto/10 text-cobalto', ponto: 'bg-cobalto/45' },
  contorno: { caixa: 'border-2 border-cobalto/25 text-cobalto', ponto: 'bg-cobalto/35' },
}

const TAMANHOS = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-12 w-12',
} as const

export function Ladrilho({
  tom = 'apagado',
  tamanho = 'md',
  className,
  children,
}: {
  tom?: Tom
  tamanho?: keyof typeof TAMANHOS
  className?: string
  children?: React.ReactNode
}) {
  const { caixa, ponto } = TONS[tom]

  return (
    <span
      aria-hidden={children ? undefined : 'true'}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-[3px] transition-colors',
        TAMANHOS[tamanho],
        caixa,
        className
      )}
    >
      {children ?? <span className={cn('block h-1.5 w-1.5 rounded-full', ponto)} />}
    </span>
  )
}
