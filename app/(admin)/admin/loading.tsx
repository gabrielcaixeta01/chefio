import { SkeletonPage, SkeletonStats } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonStats count={4} />
    </SkeletonPage>
  )
}
