import { Skeleton, SkeletonText } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div>
      {/* Hero */}
      <div className="azulejo-claro border-b border-cobalto/15 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="mt-2 h-12 w-52" />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex flex-col gap-4">
              <Skeleton className="h-11 w-11 rounded-sm" />
              <Skeleton className="h-5 w-40" />
              <SkeletonText lines={3} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
