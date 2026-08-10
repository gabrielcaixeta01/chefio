import type { LucideIcon } from 'lucide-react'
import { Ladrilho } from '@/components/ui/ladrilho'
import { cn } from '@/lib/utils'

/**
 * Número da área logada. O ícone mora dentro de um ladrilho — o mesmo quadrado
 * do menu e da parede — em vez do quadradinho arredondado genérico de
 * dashboard. É o que faz quatro métricas em linha ainda parecerem Chefio.
 */
export function StatTile({
  icon: Icon,
  label,
  valor,
  nota,
  destaque = false,
}: {
  icon: LucideIcon
  label: string
  valor: React.ReactNode
  nota?: string
  /** Marca o número que a página quer que você leia primeiro */
  destaque?: boolean
}) {
  return (
    <div className="flex flex-col rounded-md border border-cobalto/15 bg-cal p-5">
      <div className="flex items-center gap-2.5">
        <Ladrilho tom={destaque ? 'vidrado' : 'cobalto'} tamanho="sm">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </Ladrilho>
        <span className="olho text-[0.6875rem] text-tinta-suave">{label}</span>
      </div>
      <p
        className={cn(
          'mt-4 font-display text-3xl font-extrabold tabular-nums tracking-tight',
          destaque ? 'text-brasa-escura' : 'text-tinta'
        )}
      >
        {valor}
      </p>
      {nota && <p className="mt-1 text-xs text-tinta-suave/80">{nota}</p>}
    </div>
  )
}
