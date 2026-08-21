'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Ladrilho } from '@/components/ui/ladrilho'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChefHat,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileEdit,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  RotateCcw,
  ShoppingBag,
  Ticket,
  User,
  Users,
  X,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: 'LayoutDashboard' | 'Users' | 'BookOpen' | 'DollarSign' | 'Package' | 'ShoppingBag' | 'ClipboardList' | 'FileText' | 'FileEdit' | 'CreditCard' | 'RotateCcw' | 'Ticket' | 'ChefHat' | 'GraduationCap' | 'User'
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
  FileEdit,
  CreditCard,
  RotateCcw,
  Ticket,
  ChefHat,
  GraduationCap,
  User,
} satisfies Record<NavItem['icon'], typeof LayoutDashboard>

/**
 * Atalho para o outro lado da MESMA conta (decisão 4.3).
 *
 * Não é um `NavItem` de propósito. Enquanto isso morou dentro da lista de
 * navegação, "Área de aluno" se anunciava como página irmã de "Meus Cursos" e
 * "Faturamento" — e clicar nela parecia ter trocado de usuário, porque o
 * destino tem outra barra, outro título e outro conjunto de páginas. O que
 * confunde não é o destino, é a lista dizer que ele é vizinho quando ele é
 * uma saída. Separar o controle é o conserto.
 */
export interface TrocaDeArea {
  /** Para onde vai — nomeado pelo lugar, não pelo papel de quem clica. */
  label: string
  href: string
  icon: NavItem['icon']
}

interface SidebarProps {
  /** Onde a pessoa ESTÁ ("Área do aluno"), não o que ela é ("Aluno"). */
  title: string
  items: NavItem[]
  userName?: string
  troca?: TrocaDeArea
}

/** "Gabriel Caixeta Romero" → "GR". Sem nome, o ladrilho fica só com o ponto. */
function iniciais(nome?: string) {
  if (!nome) return null
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? (partes[partes.length - 1][0] ?? '') : ''
  return (primeira + ultima).toUpperCase() || null
}

/**
 * Rail da área logada — uma parede de azulejo com um ladrilho aceso.
 *
 * O fundo é o mesmo padrão do hero (`azulejo-escuro`), abafado por um degradê
 * que deixa a textura mais legível no topo, perto da marca, e vai fechando pra
 * baixo pro texto do menu não brigar com o desenho. O item ativo é o ladrilho
 * vidrado em brasa: o mesmo gesto que a parede da home faz ao acender.
 *
 * Em telas < lg vira gaveta: barra fixa no topo + painel que desliza. Antes o
 * rail de 256px era fixo e comia dois terços de um celular.
 */
export function Sidebar({ title, items, userName, troca }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const painelRef = useRef<HTMLElement>(null)
  const gatilhoRef = useRef<HTMLButtonElement>(null)

  // Fecha ao navegar — sem isso a gaveta fica por cima da página nova
  useEffect(() => {
    setAberto(false)
  }, [pathname])

  useEffect(() => {
    if (!aberto) return

    const painel = painelRef.current
    const gatilho = gatilhoRef.current

    /** Só o que é focável de verdade: o rail existe no DOM em todo tamanho de
        tela, então um `querySelectorAll` cru pegaria links do painel mesmo
        quando ele está fora da viewport. */
    function focaveis() {
      return Array.from(
        painel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []
      )
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAberto(false)
        return
      }

      // Prender o Tab dentro da gaveta: aberta, ela cobre a tela inteira, e
      // sem isso o foco continuava andando pelo conteúdo escondido atrás —
      // a pessoa tabulava "no nada" sem entender pra onde tinha ido.
      if (e.key !== 'Tab') return
      const itens = focaveis()
      if (itens.length === 0) return

      const primeiro = itens[0]
      const ultimo = itens[itens.length - 1]
      const ativo = document.activeElement

      if (e.shiftKey && (ativo === primeiro || !painel?.contains(ativo))) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && ativo === ultimo) {
        e.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    focaveis()[0]?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      // O foco volta pro botão que abriu — largado no painel que sumiu, ele
      // cairia no <body> e o próximo Tab recomeçaria do topo da página.
      gatilho?.focus()
    }
  }, [aberto])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Sessão encerrada.')
    router.push('/login')
    router.refresh()
  }

  const sigla = iniciais(userName)

  // A barra mobile divide 320px com o botão de menu e a marca, e
  // "ÁREA DO PROFESSOR" em olho (caixa alta + tracking 0.18em) não cabe ali.
  // No rail o título completo orienta; na barra ele é só relance, então o
  // prefixo sai. `olho` já força caixa alta, então a minúscula não aparece.
  const tituloCurto = title.replace(/^Área d[oaei]s?\s+/i, '')

  return (
    <>
      {/* ---------- Barra mobile ---------- */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-cal/10 bg-cobalto-escuro px-3 lg:hidden">
        <button
          ref={gatilhoRef}
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-controls="menu-painel"
          aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
          className="flex h-10 w-10 items-center justify-center rounded-sm text-cal transition-colors hover:bg-cal/10"
        >
          {/* Ícones empilhados girando um pro outro — trocar na marra deixaria
              o único corte seco no meio do movimento. */}
          <span className="relative block h-5 w-5">
            <Menu
              aria-hidden="true"
              className={cn(
                'absolute inset-0 h-5 w-5 transition-[opacity,transform] duration-200 ease-azulejo motion-reduce:transition-none',
                aberto ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
              )}
            />
            <X
              aria-hidden="true"
              className={cn(
                'absolute inset-0 h-5 w-5 transition-[opacity,transform] duration-200 ease-azulejo motion-reduce:transition-none',
                aberto ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
              )}
            />
          </span>
        </button>

        <Link href="/" className="flex items-center gap-2.5" aria-label="Chefio — página inicial">
          <Ladrilho tom="claro" tamanho="sm" />
          <span className="font-display text-lg font-extrabold tracking-tight text-cal">Chefio</span>
        </Link>

        <span className="olho ml-auto shrink-0 text-brasa-clara">{tituloCurto}</span>
      </header>

      {/* ---------- Véu da gaveta ---------- */}
      <div
        aria-hidden="true"
        onClick={() => setAberto(false)}
        className={cn(
          'fixed inset-0 z-40 bg-cobalto-escuro/70 transition-opacity duration-200 lg:hidden',
          aberto ? 'visible opacity-100' : 'invisible opacity-0'
        )}
      />

      {/* ---------- Rail ---------- */}
      <aside
        ref={painelRef}
        id="menu-painel"
        // Diálogo só enquanto é gaveta: a partir de lg vira rail permanente e
        // anunciar "diálogo" ali seria mentira pro leitor de tela.
        role={aberto ? 'dialog' : undefined}
        aria-modal={aberto ? true : undefined}
        aria-label={aberto ? `Menu — ${title}` : undefined}
        className={cn(
          'azulejo-escuro fixed inset-y-0 left-0 z-50 flex w-72 flex-col [--azulejo-tamanho:88px]',
          'transition-[transform,visibility] duration-300 ease-azulejo motion-reduce:transition-none',
          'lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:w-64 lg:shrink-0 lg:visible lg:translate-x-0',
          aberto ? 'visible translate-x-0' : 'invisible -translate-x-full'
        )}
      >
        {/* Abafa o padrão: forte em cima, fechando embaixo — luz de cozinha
            batendo na parede, e o menu continua legível. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-linear-to-b from-cobalto-escuro/55 via-cobalto-escuro/85 to-cobalto-escuro"
        />

        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* Marca */}
          <div className="px-5 pb-6 pt-6 lg:pt-7">
            <Link href="/" className="group flex items-center gap-2.5" aria-label="Chefio — página inicial">
              <Ladrilho tom="claro" tamanho="sm" />
              <span className="font-display text-xl font-extrabold tracking-tight text-cal transition-colors group-hover:text-brasa-clara">
                Chefio
              </span>
            </Link>
            <p className="olho mt-3 text-brasa-clara">{title}</p>
          </div>

          {/* ---------- Troca de área (decisão 4.3) ----------
              Fora da <nav> de propósito: não é uma página desta seção, é a
              saída para o outro lado da mesma conta. O olho "Mesma conta" é a
              frase que desfaz a confusão — sem ela o destino parece outro
              login, porque muda a barra inteira. */}
          {troca && (
            <div className="px-3 pb-4">
              <Link
                href={troca.href}
                className="group flex items-center gap-3 rounded-sm border border-cal/20 bg-cal/5 px-2.5 py-2.5 transition-colors hover:border-cal/40 hover:bg-cal/10"
              >
                <Ladrilho tom="apagado" tamanho="sm" className="group-hover:bg-cal/20 group-hover:text-cal">
                  {(() => {
                    const Icon = iconMap[troca.icon]
                    return <Icon className="h-4 w-4" aria-hidden="true" />
                  })()}
                </Ladrilho>
                <span className="min-w-0 flex-1">
                  <span className="olho block text-[0.625rem] text-cal/50">Mesma conta</span>
                  <span className="block truncate text-sm font-semibold text-cal">
                    {troca.label}
                  </span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-cal/40 transition-transform duration-200 ease-azulejo group-hover:translate-x-0.5 group-hover:text-cal motion-reduce:transition-none"
                />
              </Link>
            </div>
          )}

          {/* Menu */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
            {items.map((item) => {
              const Icon = iconMap[item.icon]
              const hrefNormalizado = item.href.replace(/\/+$/, '') || '/'
              const pathnameNormalizado = pathname.replace(/\/+$/, '') || '/'
              const isRootSection = hrefNormalizado === '/aluno' || hrefNormalizado === '/professor' || hrefNormalizado === '/admin'
              const ativo = pathnameNormalizado === hrefNormalizado || (!isRootSection && pathnameNormalizado.startsWith(`${hrefNormalizado}/`))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={ativo ? 'page' : undefined}
                  className={cn(
                    'group flex items-center gap-3 rounded-sm px-2.5 py-2 text-sm transition-colors',
                    ativo
                      ? 'bg-cal/12 font-semibold text-cal'
                      : 'font-medium text-cal/60 hover:bg-cal/8 hover:text-cal'
                  )}
                >
                  <Ladrilho
                    tom={ativo ? 'vidrado' : 'apagado'}
                    tamanho="sm"
                    className={ativo ? undefined : 'group-hover:bg-cal/20 group-hover:text-cal'}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </Ladrilho>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Saída pro site público — o aluno continua comprando curso por lá */}
          <div className="px-3 pb-3 pt-4">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-sm px-2.5 py-2 text-sm font-medium text-cal/50 transition-colors hover:bg-cal/8 hover:text-cal"
            >
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              Ver o site
            </Link>
          </div>

          {/* Conta */}
          <div className="border-t border-cal/12 p-4">
            <div className="flex items-center gap-3">
              <Ladrilho tom="apagado" tamanho="md">
                {sigla ? (
                  <span className="font-display text-xs font-extrabold text-cal">{sigla}</span>
                ) : undefined}
              </Ladrilho>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-cal">
                {userName ?? 'Minha conta'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-sm font-semibold text-cal/60 transition-colors hover:bg-cal/10 hover:text-cal"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
