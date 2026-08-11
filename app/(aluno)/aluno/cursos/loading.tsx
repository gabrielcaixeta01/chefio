import { SkeletonCardGrid, SkeletonPage, SkeletonToolbar } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <SkeletonPage toolbar={<SkeletonToolbar pills={4} />}>
      <SkeletonCardGrid count={6} columns={3} />
    </SkeletonPage>
  )
}
