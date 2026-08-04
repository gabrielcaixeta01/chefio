import Link from 'next/link'

const PLATAFORMA = [
  { href: '/cursos', label: 'Explorar cursos' },
  { href: '/cadastro', label: 'Criar conta' },
  { href: '/para-chefs', label: 'Ensinar na Chefio' },
]

/* Sem página ainda — ficam como texto, não como link morto. */
const SUPORTE = ['Central de ajuda', 'Termos de uso', 'Privacidade']

export function Footer() {
  return (
    <footer className="mt-auto">
      <div className="azulejo-claro faixa-azulejo" />

      <div className="bg-cobalto-escuro text-cal/70">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
            <div className="md:col-span-2">
              <Link
                href="/"
                className="group inline-flex items-center gap-2.5"
                aria-label="Chefio — página inicial"
              >
                <span
                  aria-hidden="true"
                  className="azulejo-escuro block h-8 w-8 shrink-0 rounded-sm ring-1 ring-cal/20 [--azulejo-tamanho:32px]"
                />
                <span className="font-display text-xl font-extrabold tracking-tight text-cal transition-colors group-hover:text-brasa">
                  Chefio
                </span>
              </Link>
              <p className="mt-5 max-w-sm leading-relaxed">
                A plataforma de cursos de culinária para quem ama cozinhar.
                Aprenda com os melhores chefs do Brasil.
              </p>
            </div>

            <div>
              <h2 className="olho text-cal">Plataforma</h2>
              <ul className="mt-5 space-y-3 text-sm">
                {PLATAFORMA.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="transition-colors hover:text-brasa"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="olho text-cal">Suporte</h2>
              <ul className="mt-5 space-y-3 text-sm text-cal/65">
                {SUPORTE.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-14 border-t border-cal/15 pt-8 text-xs text-cal/65">
            © {new Date().getFullYear()} Chefio. Todos os direitos reservados.
          </div>
        </div>
      </div>
    </footer>
  )
}
