import { SkeletonPage, SkeletonTable } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <SkeletonPage action={false}>
      <SkeletonTable rows={5} cols={3} />
    </SkeletonPage>
  )
}
