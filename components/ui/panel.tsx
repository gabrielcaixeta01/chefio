import { cn } from '@/lib/utils'

/**
 * Superfície padrão da área logada: um azulejo inteiro de cal sobre o fundo.
 * Sem preenchimento próprio — quem usa decide se dentro vai padding (conteúdo)
 * ou `divide-y` (lista), que eram os dois jeitos que já apareciam solto pelas
 * páginas escritos à mão de formas ligeiramente diferentes.
 */
export function Panel({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('rounded-md border border-cobalto/15 bg-cal', className)}>{children}</div>
  )
}

/** Cabeçalho de seção: título em display + um link de escape à direita. */
export function SectionHeading({
  titulo,
  acao,
  className,
}: {
  titulo: React.ReactNode
  acao?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1', className)}>
      <h2 className="font-display text-xl font-bold tracking-tight text-tinta">{titulo}</h2>
      {acao}
    </div>
  )
}
