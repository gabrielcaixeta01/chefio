import { SkeletonCardGrid, SkeletonPage } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonCardGrid count={6} columns={3} />
    </SkeletonPage>
  )
}
