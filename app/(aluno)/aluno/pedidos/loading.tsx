import { SkeletonPageHeader, SkeletonTable } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div>
      <SkeletonPageHeader action={false} />
      <SkeletonTable rows={6} cols={4} />
    </div>
  )
}
