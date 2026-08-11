import { Skeleton, SkeletonPage, SkeletonStats } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <SkeletonPage action={false}>
      <SkeletonStats count={3} />

      {/* Gráfico de receita mensal */}
      <div className="mb-6 rounded-md border border-cobalto/15 bg-cal p-5 sm:p-6">
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="flex h-44 items-end gap-2 sm:gap-3">
          {[45, 70, 35, 90, 60, 80].map((altura, i) => (
            <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <Skeleton className="h-3 w-12" />
              <div className="flex h-full w-full items-end">
                <Skeleton className="w-full rounded-t-sm" style={{ height: `${altura}%` }} />
              </div>
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 w-full rounded-md" />
        <Skeleton className="h-80 w-full rounded-md" />
      </div>
    </SkeletonPage>
  )
}
