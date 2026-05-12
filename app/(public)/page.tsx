import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { ChefHat, BookOpen, ShoppingBag, Star, Users, Play } from 'lucide-react'

export default async function LandingPage() {
  let featuredCourses: any[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('courses')
      .select('id, title, slug, thumbnail_url, price, teacher:profiles(name)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(4)
    featuredCourses = data ?? []
  } catch {
    // Supabase não configurado
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-50 to-amber-50 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <ChefHat className="h-4 w-4" />
            A plataforma de culinária do Brasil
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Aprenda com os{' '}
            <span className="text-orange-600">melhores chefs</span>{' '}
            do Brasil
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Cursos de culinária, confeitaria, panificação e muito mais. Do básico ao avançado,
            no seu ritmo e com os ingredientes certos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/cursos">
              <Button size="lg" className="w-full sm:w-auto">
                Explorar cursos
              </Button>
            </Link>
            <Link href="/cadastro?role=teacher">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Quero ensinar
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-y border-gray-100 py-12 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-3xl font-bold text-orange-600">500+</p>
            <p className="text-gray-500 text-sm mt-1">Aulas disponíveis</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-orange-600">50+</p>
            <p className="text-gray-500 text-sm mt-1">Chefs instrutores</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-orange-600">10k+</p>
            <p className="text-gray-500 text-sm mt-1">Alunos formados</p>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Como funciona</h2>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
            Três passos simples para começar sua jornada culinária
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: BookOpen, title: 'Escolha seu curso', desc: 'Navegue pelo catálogo e encontre o curso ideal para você, desde culinária básica até técnicas avançadas de confeitaria.' },
              { icon: Play, title: 'Assista às aulas', desc: 'Acesse as aulas em vídeo no seu ritmo, com qualidade HD e anotações no caderno digital integrado.' },
              { icon: ShoppingBag, title: 'Compre os produtos', desc: 'Ao final de cada aula, encontre os utensílios e ingredientes usados pelo chef diretamente na nossa loja.' },
            ].map((step, i) => {
              const Icon = step.icon
              return (
                <div key={i} className="text-center">
                  <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Cursos em destaque */}
      {featuredCourses && featuredCourses.length > 0 && (
        <section className="py-20 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Cursos em destaque</h2>
              <Link href="/cursos" className="text-orange-600 hover:underline text-sm font-medium">
                Ver todos →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredCourses.map((course) => (
                <Link
                  key={course.id}
                  href={`/curso/${course.slug}`}
                  className="group rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative aspect-video bg-gray-100">
                    {course.thumbnail_url ? (
                      <Image src={course.thumbnail_url} alt={course.title} fill className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ChefHat className="h-10 w-10 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 group-hover:text-orange-600 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">por {(course.teacher as any)?.name}</p>
                    <p className="text-orange-600 font-bold mt-2 text-sm">
                      {course.price === 0 ? 'Grátis' : formatCurrency(course.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Professor */}
      <section className="py-20 px-4 bg-gray-900 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <ChefHat className="h-12 w-12 text-orange-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Você é chef, padeiro ou confeiteiro?</h2>
          <p className="text-gray-400 mb-8 text-lg">
            Compartilhe seu conhecimento com milhares de alunos e monetize sua expertise culinária.
          </p>
          <Link href="/cadastro">
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
              Começar a ensinar
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
