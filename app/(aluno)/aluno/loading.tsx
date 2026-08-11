import { Skeleton, SkeletonCardGrid, SkeletonPage, SkeletonStats } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <SkeletonPage>
      {/* "Continue de onde parou" — o bloco que abre a página */}
      <div className="mb-10 flex flex-col gap-6 rounded-md border border-cobalto/15 bg-cal p-6 sm:flex-row sm:p-7">
        <Skeleton className="aspect-video w-full shrink-0 sm:w-60" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-8 w-3/5" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-1.5 w-full max-w-md" />
          <Skeleton className="mt-3 h-11 w-44" />
        </div>
      </div>

      <SkeletonStats count={4} />

      <Skeleton className="mb-4 h-6 w-40" />
      <SkeletonCardGrid count={3} columns={3} />
    </SkeletonPage>
  )
}
