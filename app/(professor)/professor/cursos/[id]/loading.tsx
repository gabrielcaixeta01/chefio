import { Skeleton, SkeletonForm, SkeletonPageHeader } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div>
      <SkeletonPageHeader />
      <SkeletonForm fields={5} />

      {/* Lista de aulas, abaixo do formulário do curso */}
      <div className="mt-10 max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-sm border border-cobalto/10 bg-cal p-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-sm" />
                <Skeleton className="h-4 w-56 max-w-[40vw]" />
              </div>
              <Skeleton className="h-8 w-8 rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
