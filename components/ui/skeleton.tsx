import { cn } from '@/lib/utils'

/* Esqueletos de conteúdo: o mesmo desenho da página, ainda sem vidrado.
   Todos herdam `.esqueleto` (cal apagada + brilho varrendo) do globals.css.

   Regra de uso: o esqueleto imita o *layout*, não o conteúdo. Se a página tem
   um header, três cards e uma tabela, o esqueleto tem header, três cards e
   tabela — assim nada salta de lugar quando o conteúdo real chega. */

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('esqueleto rounded-sm', className)}
      aria-hidden="true"
      {...props}
    />
  )
}

/** Parágrafo falso. A última linha sai mais curta, como texto de verdade. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3.5', i === lines - 1 ? 'w-2/5' : 'w-full')}
        />
      ))}
    </div>
  )
}

/** Cabeçalho de página: título, subtítulo e o botão de ação da direita. */
export function SkeletonPageHeader({ action = true }: { action?: boolean }) {
  return (
    <div className="mb-8 flex items-start justify-between gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      {action && <Skeleton className="h-11 w-44 shrink-0" />}
    </div>
  )
}

/** Fileira de cartões de métrica dos dashboards. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-md border border-cobalto/15 bg-cal p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-8 rounded-sm" />
          </div>
          <Skeleton className="h-7 w-28" />
        </div>
      ))}
    </div>
  )
}

/** Grade de cursos/produtos: capa 16:9 + duas linhas de texto + preço. */
export function SkeletonCardGrid({
  count = 6,
  columns = 3,
}: {
  count?: number
  columns?: 2 | 3 | 4
}) {
  const grade = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }[columns]

  return (
    <div className={cn('grid grid-cols-1 gap-6', grade)}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-md border border-cobalto/15 bg-cal"
        >
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="flex flex-col gap-3 p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-3.5 w-1/2" />
            <div className="mt-2 flex items-center justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Lista/tabela administrativa. */
export function SkeletonTable({
  rows = 6,
  cols = 4,
}: {
  rows?: number
  cols?: number
}) {
  return (
    <div className="overflow-hidden rounded-md border border-cobalto/15 bg-cal">
      <div
        className="grid gap-4 border-b border-cobalto/15 bg-cal-fundo px-5 py-3.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="grid items-center gap-4 border-b border-cobalto/10 px-5 py-4 last:border-b-0"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton
              key={c}
              className={cn('h-4', c === 0 ? 'w-11/12' : 'w-2/3')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Formulário: rótulo + campo, repetido. */
export function SkeletonForm({ fields = 5 }: { fields?: number }) {
  return (
    <div className="max-w-2xl rounded-md border border-cobalto/15 bg-cal p-6">
      <div className="flex flex-col gap-6">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className={cn(i === fields - 1 ? 'h-28' : 'h-11', 'w-full')} />
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-11 w-36" />
          <Skeleton className="h-11 w-28" />
        </div>
      </div>
    </div>
  )
}

/** Barra de filtros do catálogo: busca + pílulas de categoria. */
export function SkeletonFilters({ pills = 6 }: { pills?: number }) {
  return (
    <div className="mb-8 flex flex-col gap-4">
      <Skeleton className="h-12 w-full max-w-md" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: pills }, (_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-full" />
        ))}
      </div>
    </div>
  )
}
