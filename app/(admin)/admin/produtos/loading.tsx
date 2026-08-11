import { SkeletonForm, SkeletonPage, SkeletonTable } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <SkeletonPage action={false}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:order-2 lg:col-span-1">
          <SkeletonForm fields={4} />
        </div>
        <div className="lg:order-1 lg:col-span-2">
          <SkeletonTable rows={6} cols={3} />
        </div>
      </div>
    </SkeletonPage>
  )
}
