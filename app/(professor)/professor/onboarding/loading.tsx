import { SkeletonForm, SkeletonPage } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <SkeletonPage action={false}>
      <SkeletonForm fields={4} />
    </SkeletonPage>
  )
}
