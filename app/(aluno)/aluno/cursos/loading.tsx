import { SkeletonCardGrid, SkeletonFilters, SkeletonPageHeader } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div>
      <SkeletonPageHeader />
      <SkeletonFilters pills={4} />
      <SkeletonCardGrid count={6} columns={3} />
    </div>
  )
}
