import Link from 'next/link'
import { ChefHat } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Conteúdo compartilhado pelos boundaries de 404 (raiz e grupo (public)).
 * O logo é um Link para "/" porque esta tela pode ser renderizada fora do
 * layout que contém a Navbar — sem ele o usuário fica sem saída.
 */
export function NotFoundView() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-cobalto"
      >
        <ChefHat className="h-6 w-6" aria-hidden="true" />
        <span>Chefio</span>
      </Link>

      <p className="olho text-brasa-escura">404</p>
      <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-tinta">
        Página não encontrada
      </h1>
      <p className="mt-3 max-w-md text-tinta-suave">
        A página que você procura não existe ou foi movida.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/">
          <Button size="lg">Voltar para a home</Button>
        </Link>
        <Link href="/cursos">
          <Button variant="outline" size="lg">
            Explorar cursos
          </Button>
        </Link>
      </div>
    </div>
  )
}
