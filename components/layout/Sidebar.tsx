'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  BookOpen,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingBag,
  Users,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: 'LayoutDashboard' | 'Users' | 'BookOpen' | 'DollarSign' | 'Package' | 'ShoppingBag' | 'ClipboardList' | 'FileText' | 'CreditCard'
}

const iconMap = {
  LayoutDashboard,
  Users,
  BookOpen,
  DollarSign,
  Package,
  ShoppingBag,
  ClipboardList,
  FileText,
  CreditCard,
} satisfies Record<NavItem['icon'], typeof LayoutDashboard>

interface SidebarProps {
  title: string
  items: NavItem[]
  userName?: string
}

export function Sidebar({ title, items, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Sessão encerrada.')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col bg-cobalto-escuro text-cal">
      {/* Header */}
      <div className="border-b border-cal/15 p-6">
        <Link
          href="/"
          className="font-display text-xl font-extrabold tracking-tight text-cal transition-colors hover:text-brasa-clara"
        >
          Chefio
        </Link>
        <p className="olho mt-2 text-brasa-clara">{title}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const Icon = iconMap[item.icon]
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-brasa text-tinta'
                  : 'text-cal/70 hover:bg-cal/10 hover:text-cal'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-cal/15 p-4">
        {userName && (
          <p className="mb-2 truncate text-xs text-cal/60">{userName}</p>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 text-sm font-semibold text-cal/70 transition-colors hover:text-cal"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair
        </button>
      </div>
    </aside>
  )
}
