import { Skeleton, SkeletonPage } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <SkeletonPage>
      {/* Barra de progresso do curso */}
      <div className="mb-6 rounded-md border border-cobalto/15 bg-cal p-5">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-5 w-12" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.65fr_0.95fr]">
        {/* Lista de aulas */}
        <div className="overflow-hidden rounded-md border border-cobalto/15 bg-cal">
          <div className="flex items-center justify-between border-b border-cobalto/10 px-4 py-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-cobalto/10 px-4 py-3 last:border-b-0"
            >
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 flex-1 max-w-64" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>

        {/* Caderno */}
        <Skeleton className="h-72 w-full rounded-md" />
      </div>
    </SkeletonPage>
  )
}
