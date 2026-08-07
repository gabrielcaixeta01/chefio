import { Skeleton, SkeletonText } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="max-w-5xl">
      <Skeleton className="mb-4 h-4 w-40" />
      <Skeleton className="mb-3 h-8 w-96 max-w-full" />
      <SkeletonText lines={2} className="mb-6 max-w-2xl" />

      {/* Barra de progresso do curso */}
      <div className="mb-8 rounded-md border border-cobalto/15 bg-cal p-5">
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-12" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Lista de aulas */}
      <Skeleton className="mb-4 h-5 w-32" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-sm border border-cobalto/10 bg-cal p-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-64 max-w-[45vw]" />
            </div>
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
  )
}
