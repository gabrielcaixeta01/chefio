import { Skeleton, SkeletonPage, SkeletonTable } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <SkeletonPage
      action={false}
      toolbar={
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-28" />
          ))}
        </div>
      }
    >
      <SkeletonTable rows={8} cols={4} />
    </SkeletonPage>
  )
}
