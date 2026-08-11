import { AzulejoLoader, IndeterminateBar } from '@/components/ui/loader'
import { Skeleton, SkeletonText } from '@/components/ui/skeleton'
import { PageBody } from '@/components/layout/PageShell'

export default function Loading() {
  return (
    <PageBody className="max-w-5xl">
      <Skeleton className="mb-4 h-4 w-72 max-w-full" />

      {/* O player é o motivo de estar aqui: em vez de um retângulo morto, o
          quadro do vídeo carrega a parede acendendo. */}
      <div className="mb-4 flex aspect-video w-full flex-col items-center justify-center gap-5 rounded-md bg-cobalto/10">
        <AzulejoLoader size="lg" />
        <IndeterminateBar className="w-40" />
        <span className="olho text-cobalto/70">Carregando aula</span>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-3">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-11 w-40 shrink-0" />
      </div>

      <div className="my-8 flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-40" />
      </div>

      <Skeleton className="mb-3 h-4 w-24" />
      <div className="rounded-md border border-cobalto/15 bg-cal p-5">
        <SkeletonText lines={5} />
      </div>
    </PageBody>
  )
}
