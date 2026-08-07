import { SkeletonForm, SkeletonPageHeader } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div>
      <SkeletonPageHeader action={false} />
      <SkeletonForm fields={6} />
    </div>
  )
}
