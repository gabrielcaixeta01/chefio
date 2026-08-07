import {
  SkeletonPageHeader,
  SkeletonStats,
  SkeletonTable,
} from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div>
      <SkeletonPageHeader />
      <SkeletonStats count={3} />
      <SkeletonTable rows={8} cols={5} />
    </div>
  )
}
