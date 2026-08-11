import { SkeletonPage, SkeletonTable } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <SkeletonPage action={false}>
      <SkeletonTable rows={8} cols={4} />
    </SkeletonPage>
  )
}
