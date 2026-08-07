import {
  SkeletonCardGrid,
  SkeletonPageHeader,
  SkeletonStats,
} from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div>
      <SkeletonPageHeader />
      <SkeletonStats count={4} />
      <SkeletonCardGrid count={3} columns={3} />
    </div>
  )
}
