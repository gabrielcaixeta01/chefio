import {
  Skeleton,
  SkeletonCardGrid,
  SkeletonFilters,
} from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-corpo sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <SkeletonFilters pills={7} />
      <SkeletonCardGrid count={12} columns={3} />
    </div>
  )
}
