import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  buildHref: (page: number) => string
}

/** Paginação GET nativa (sem client component) pro visual de dashboard — admin e aluno. */
export function Pagination({ page, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null

  const prevDisabled = page <= 1
  const nextDisabled = page >= totalPages

  return (
    <nav className="flex items-center justify-center gap-3 mt-8" aria-label="Paginação">
      <Link
        href={buildHref(page - 1)}
        aria-disabled={prevDisabled}
        tabIndex={prevDisabled ? -1 : undefined}
        className={cn(
          'flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium border border-gray-200 bg-white transition-colors',
          prevDisabled ? 'pointer-events-none opacity-40' : 'text-gray-700 hover:bg-gray-50'
        )}
      >
        <ChevronLeft className="h-4 w-4" />
        Anterior
      </Link>
      <span className="text-sm text-gray-500">
        Página {page} de {totalPages}
      </span>
      <Link
        href={buildHref(page + 1)}
        aria-disabled={nextDisabled}
        tabIndex={nextDisabled ? -1 : undefined}
        className={cn(
          'flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium border border-gray-200 bg-white transition-colors',
          nextDisabled ? 'pointer-events-none opacity-40' : 'text-gray-700 hover:bg-gray-50'
        )}
      >
        Próxima
        <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  )
}
