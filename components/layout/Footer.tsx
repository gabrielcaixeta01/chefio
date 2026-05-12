import Link from 'next/link'
import { ChefHat } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-xl mb-3">
              <ChefHat className="h-6 w-6 text-orange-500" />
              Chefio
            </Link>
            <p className="text-sm leading-relaxed">
              A plataforma de cursos de culinária para quem ama cozinhar.
              Aprenda com os melhores chefs do Brasil.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4 text-sm">Plataforma</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/cursos" className="hover:text-white transition-colors">Explorar cursos</Link></li>
              <li><Link href="/cadastro" className="hover:text-white transition-colors">Criar conta</Link></li>
              <li><Link href="/cadastro?role=teacher" className="hover:text-white transition-colors">Ensinar na Chefio</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4 text-sm">Suporte</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="hover:text-white transition-colors cursor-pointer">Central de ajuda</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Termos de uso</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Privacidade</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-xs">
          © {new Date().getFullYear()} Chefio. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  )
}
