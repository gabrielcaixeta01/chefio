import { Skeleton, SkeletonCardGrid, SkeletonPageHeader, SkeletonStats } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div>
      <SkeletonPageHeader />
      <SkeletonStats count={4} />

      {/* "Continue de onde parou" */}
      <Skeleton className="mb-3 h-6 w-52" />
      <div className="mb-10 flex flex-col gap-5 rounded-md border border-cobalto/15 bg-cal p-5 sm:flex-row">
        <Skeleton className="aspect-video w-full shrink-0 sm:w-64" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-7 w-3/5" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="mt-2 h-1.5 w-full max-w-md" />
          <Skeleton className="mt-2 h-11 w-44" />
        </div>
      </div>

      <Skeleton className="mb-3 h-6 w-40" />
      <SkeletonCardGrid count={3} columns={3} />
    </div>
  )
}
