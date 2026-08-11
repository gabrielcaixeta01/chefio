import { AlertCircle, CheckCircle, Info, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Recado no topo da página — Stripe pendente, curso em revisão, compra
 * concluída. Estavam escritos à mão em cinco lugares, cada um com um tom de
 * âmbar e um espaçamento diferente; agora é um só, com a ação à direita, que é
 * onde o olho vai depois de ler o problema.
 */

type Tipo = 'atencao' | 'erro' | 'sucesso' | 'info'

const ESTILOS: Record<Tipo, { caixa: string; icone: string; titulo: string; corpo: string; padrao: LucideIcon }> = {
  atencao: {
    caixa: 'border-amber-200 bg-amber-50',
    icone: 'text-amber-700',
    titulo: 'text-amber-900',
    corpo: 'text-amber-800',
    padrao: AlertCircle,
  },
  erro: {
    caixa: 'border-red-200 bg-red-50',
    icone: 'text-red-600',
    titulo: 'text-red-900',
    corpo: 'text-red-800',
    padrao: AlertCircle,
  },
  sucesso: {
    caixa: 'border-emerald-200 bg-emerald-50',
    icone: 'text-emerald-600',
    titulo: 'text-emerald-900',
    corpo: 'text-emerald-800',
    padrao: CheckCircle,
  },
  info: {
    caixa: 'border-cobalto/25 bg-cobalto/8',
    icone: 'text-cobalto',
    titulo: 'text-tinta',
    corpo: 'text-tinta-suave',
    padrao: Info,
  },
}

export function Notice({
  tipo = 'info',
  icon,
  titulo,
  children,
  acao,
  className,
  role,
}: {
  tipo?: Tipo
  icon?: LucideIcon
  titulo?: string
  children?: React.ReactNode
  acao?: React.ReactNode
  className?: string
  /** `role="alert"` pros erros que aparecem depois de um envio: sem isso o
      leitor de tela não anuncia nada e a pessoa fica esperando resposta. */
  role?: 'alert' | 'status'
}) {
  const estilo = ESTILOS[tipo]
  const Icon = icon ?? estilo.padrao

  return (
    <div
      role={role}
      className={cn(
        'flex flex-col gap-4 rounded-md border p-4 sm:flex-row sm:items-center',
        estilo.caixa,
        className
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', estilo.icone)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {titulo && <p className={cn('text-sm font-semibold', estilo.titulo)}>{titulo}</p>}
        {children && (
          <div className={cn('text-sm leading-relaxed', estilo.corpo, titulo && 'mt-1 text-xs')}>
            {children}
          </div>
        )}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </div>
  )
}
