'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * Link da navbar pública com estado de "você está aqui".
 *
 * O sublinhado de brasa já existia no hover; o que faltava era ele ficar
 * quando a página é a atual. Sem isso os dois links do topo eram idênticos em
 * /cursos e em /para-chefs, e a única pista de localização era a URL — o menu
 * lateral da área logada marca `aria-current` desde sempre, o topo não.
 */
export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const ativo = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      aria-current={ativo ? 'page' : undefined}
      className={cn(
        'relative py-1 text-sm font-semibold transition-colors',
        'after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:bg-brasa after:transition-transform after:duration-200',
        ativo
          ? 'text-tinta after:scale-x-100'
          : 'text-tinta-suave after:scale-x-0 hover:text-tinta hover:after:scale-x-100'
      )}
    >
      {label}
    </Link>
  )
}
