import { SkeletonPage, SkeletonStats, SkeletonTable } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonStats count={3} />
      <SkeletonTable rows={6} cols={3} />
    </SkeletonPage>
  )
}
