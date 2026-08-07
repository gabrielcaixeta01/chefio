import {
  SkeletonCardGrid,
  SkeletonFilters,
  SkeletonPageHeader,
} from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div>
      <SkeletonPageHeader />
      <SkeletonFilters pills={5} />
      <SkeletonCardGrid count={8} columns={4} />
    </div>
  )
}
