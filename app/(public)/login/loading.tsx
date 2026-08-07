import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-md border border-cobalto/15 bg-cal p-8">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-60" />
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-11 w-full" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-11 w-full" />
          </div>
          <Skeleton className="mt-1 h-11 w-full" />
          <Skeleton className="mx-auto h-3.5 w-52" />
        </div>
      </div>
    </div>
  )
}
