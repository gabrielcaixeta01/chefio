import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ActionLink } from '@/components/ui/action-link'
import { MobileNav } from './MobileNav'

const LINKS = [
  { href: '/cursos', label: 'Cursos' },
  { href: '/cursos?filter=chef', label: 'Para chefs' },
]

/** Marca: um único ladrilho, com os mesmos arcos de canto da parede do hero. */
function Ladrilho() {
  return (
    <span
      aria-hidden="true"
      className="azulejo-escuro block h-8 w-8 shrink-0 rounded-sm [--azulejo-tamanho:32px]"
    />
  )
}

export async function Navbar() {
  let user = null
  let profile = null

  try {
    const supabase = await createClient()
    const { data: { user: u } } = await supabase.auth.getUser()
    user = u
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', user.id)
        .single()
      profile = data
    }
  } catch {
    // Supabase não configurado ainda — exibe navbar sem estado de auth
  }

  const dashboardLink = profile?.role === 'admin'
    ? '/admin'
    : profile?.role === 'teacher'
    ? '/professor'
    : '/aluno'

  const autenticacao = user && profile ? (
    <ActionLink href={dashboardLink} variant="cobalto">
      Minha área
    </ActionLink>
  ) : (
    <>
      <Link
        href="/login"
        className="inline-flex h-11 items-center px-4 text-sm font-semibold text-tinta transition-colors hover:text-brasa-escura"
      >
        Entrar
      </Link>
      <ActionLink href="/cadastro">Começar grátis</ActionLink>
    </>
  )

  return (
    <header className="sticky top-0 z-50 border-b border-cobalto/15 bg-cal/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-6">
          <Link
            href="/"
            className="group flex items-center gap-2.5"
            aria-label="Chefio — página inicial"
          >
            <Ladrilho />
            <span className="font-display text-xl font-extrabold tracking-tight text-tinta transition-colors group-hover:text-cobalto">
              Chefio
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative py-1 text-sm font-semibold text-tinta-suave transition-colors hover:text-tinta after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-brasa after:transition-transform after:duration-200 hover:after:scale-x-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">{autenticacao}</div>

          <MobileNav links={LINKS}>{autenticacao}</MobileNav>
        </div>
      </div>
    </header>
  )
}
