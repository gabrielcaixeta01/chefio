import { SkeletonCardGrid, SkeletonPageHeader } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div>
      <SkeletonPageHeader action={false} />
      <SkeletonCardGrid count={6} columns={3} />
    </div>
  )
}
