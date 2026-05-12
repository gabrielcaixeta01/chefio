import Link from 'next/link'
import { ChefHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

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

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-orange-600">
            <ChefHat className="h-6 w-6" />
            <span>Chefio</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/cursos" className="hover:text-orange-600 transition-colors">
              Cursos
            </Link>
            <Link href="/cursos?filter=chef" className="hover:text-orange-600 transition-colors">
              Para Chefs
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {user && profile ? (
              <Link href={dashboardLink}>
                <Button variant="default" size="sm">
                  Minha área
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Entrar</Button>
                </Link>
                <Link href="/cadastro">
                  <Button size="sm">Começar grátis</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
