import { Skeleton, SkeletonText } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Coluna principal: capa, título, sobre, instrutor, aulas */}
        <div className="lg:col-span-2">
          <Skeleton className="mb-6 aspect-video w-full rounded-md" />
          <Skeleton className="mb-3 h-6 w-28 rounded-full" />
          <Skeleton className="mb-4 h-9 w-4/5" />

          <div className="mb-8 flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>

          <Skeleton className="mb-3 h-5 w-40" />
          <SkeletonText lines={4} className="mb-8" />

          <div className="mb-8 flex items-start gap-3 rounded-md bg-cal-fundo p-4">
            <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
            <div className="flex w-full flex-col gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>

          <Skeleton className="mb-4 h-5 w-48" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-sm border border-cobalto/10 bg-white p-3"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-sm" />
                  <Skeleton className="h-4 w-52" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>

        {/* Cartão de compra */}
        <aside>
          <div className="flex flex-col gap-4 rounded-md border border-cobalto/15 bg-cal p-6">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-4 w-40" />
            <div className="mt-2 flex flex-col gap-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
