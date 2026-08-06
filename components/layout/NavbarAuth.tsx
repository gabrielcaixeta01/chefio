'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ActionLink } from '@/components/ui/action-link'

type Role = 'admin' | 'teacher' | 'student' | null

const DASHBOARD_BY_ROLE: Record<string, string> = {
  admin: '/admin',
  teacher: '/professor',
  student: '/aluno',
}

/**
 * Estado de sessão fica no client de propósito: checar aqui (via
 * getSession(), que só lê o storage local, sem round-trip) é o que permite
 * `/`, `/cursos` e `/para-chefs` renderizarem estáticas — se a Navbar
 * chamasse cookies() no servidor pra saber o usuário, isso opta a rota
 * inteira por dinâmica no Next 14 (sem PPR).
 *
 * Primeira renderização assume visitante (o caso mais comum em página
 * pública) pra não depender de um placeholder com tamanho adivinhado; quem
 * já está logado vê o link trocar pra "Minha área" assim que o efeito roda.
 */
export function NavbarAuth() {
  const [role, setRole] = useState<Role>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setRole((session?.user.app_metadata.role as Role) ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setRole((session?.user.app_metadata.role as Role) ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (role) {
    return (
      <ActionLink href={DASHBOARD_BY_ROLE[role]} variant="cobalto">
        Minha área
      </ActionLink>
    )
  }

  return (
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
}
