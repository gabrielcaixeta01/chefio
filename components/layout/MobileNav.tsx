'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

interface MobileNavProps {
  links: Array<{ href: string; label: string }>
  /** Bloco de autenticação renderizado no servidor pela Navbar */
  children: React.ReactNode
}

export function MobileNav({ links, children }: MobileNavProps) {
  const [aberto, setAberto] = useState(false)
  const pathname = usePathname()

  // Fecha ao navegar — sem isso o painel fica por cima da página nova
  useEffect(() => {
    setAberto(false)
  }, [pathname])

  useEffect(() => {
    if (!aberto) return

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [aberto])

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls="menu-mobile"
        aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
        className="flex h-11 w-11 items-center justify-center rounded-sm text-cobalto transition-colors hover:bg-cobalto/10"
      >
        {aberto ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {aberto && (
        <div
          id="menu-mobile"
          className="fixed inset-x-0 top-16 bottom-0 z-40 border-t border-cobalto/15 bg-cal px-6 py-8"
        >
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="border-b border-cobalto/10 py-4 font-display text-2xl font-bold tracking-tight text-tinta transition-colors hover:text-brasa-escura"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 flex flex-col gap-3">{children}</div>
        </div>
      )}
    </div>
  )
}
