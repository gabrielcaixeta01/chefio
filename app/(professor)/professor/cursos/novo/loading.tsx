import { SkeletonForm, SkeletonPage } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <SkeletonPage action={false}>
      <SkeletonForm fields={6} />
    </SkeletonPage>
  )
}
