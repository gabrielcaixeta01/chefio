'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  links: Array<{ href: string; label: string }>
  /** Bloco de autenticação renderizado no servidor pela Navbar */
  children: React.ReactNode
}

/** Entrada escalonada: os itens acendem em sequência, como os ladrilhos do hero.
    A saída não escalona — sair rápido e junto parece resposta, não animação. */
const PASSO_MS = 45

export function MobileNav({ links, children }: MobileNavProps) {
  const [aberto, setAberto] = useState(false)
  const [montado, setMontado] = useState(false)
  const pathname = usePathname()

  // O portal precisa do document; no servidor ele não existe
  useEffect(() => {
    setMontado(true)
  }, [])

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

  // O painel fica sempre montado para poder animar a saída. `visibility` entra
  // na transição de propósito: ela troca só no fim da duração, então o painel
  // some do foco do teclado depois do fade, não durante.
  const painel = (
    <div
      id="menu-mobile"
      aria-hidden={!aberto}
      className={cn(
        'fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-cobalto/15 bg-cal px-6 py-8 md:hidden',
        'transition-[opacity,transform,visibility] ease-azulejo motion-reduce:transition-none',
        aberto
          ? 'visible translate-y-0 opacity-100 duration-300'
          : 'invisible -translate-y-2 opacity-0 duration-200'
      )}
    >
      <nav className="flex flex-col gap-1">
        {links.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            tabIndex={aberto ? undefined : -1}
            style={{ transitionDelay: aberto ? `${60 + i * PASSO_MS}ms` : '0ms' }}
            className={cn(
              'border-b border-cobalto/10 py-4 font-display text-2xl font-bold tracking-tight text-tinta',
              'transition-[opacity,transform,color] duration-300 ease-azulejo hover:text-brasa-escura motion-reduce:transition-none',
              aberto ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div
        style={{
          transitionDelay: aberto ? `${60 + links.length * PASSO_MS}ms` : '0ms',
        }}
        className={cn(
          'mt-8 flex flex-col gap-3',
          'transition-[opacity,transform] duration-300 ease-azulejo motion-reduce:transition-none',
          aberto ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        )}
      >
        {children}
      </div>
    </div>
  )

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
        {/* Os dois ícones ficam empilhados e giram um para o outro — trocar
            na marra deixaria o único corte seco no meio do movimento. */}
        <span className="relative block h-6 w-6">
          <Menu
            aria-hidden="true"
            className={cn(
              'absolute inset-0 h-6 w-6 transition-[opacity,transform] duration-200 ease-azulejo motion-reduce:transition-none',
              aberto ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
            )}
          />
          <X
            aria-hidden="true"
            className={cn(
              'absolute inset-0 h-6 w-6 transition-[opacity,transform] duration-200 ease-azulejo motion-reduce:transition-none',
              aberto ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
            )}
          />
        </span>
      </button>

      {/* Portal pro <body>: o backdrop-blur do header cria um containing block
          e um `fixed` aqui dentro colapsaria contra os 64px da barra. */}
      {montado && createPortal(painel, document.body)}
    </div>
  )
}
