import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import type { User } from '@supabase/supabase-js'

type Role = Database['public']['Tables']['profiles']['Row']['role']

/**
 * getUser() valida o JWT contra o Auth server — não dá pra evitar o round-trip.
 * O cache() do React dedupe chamadas dentro do mesmo request (layout + página
 * pedindo o usuário não vira duas chamadas de rede).
 */
export const getAuthedUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

/** Role cru lido do JWT (app_metadata), sincronizado via trigger — sem SELECT em profiles. */
export function roleFromUser(user: User | null): Role | null {
  return (user?.app_metadata?.role as Role | undefined) ?? null
}

/** True quando a pessoa é o dono/financeiro (decisão 1.2 — só ele altera comissão). */
export function isOwner(user: User | null): boolean {
  return roleFromUser(user) === 'owner'
}

/**
 * Só exige sessão. É o portão de `/aluno`: desde a decisão 4.3 a mesma conta é
 * aluna e professora, então quem ensina também tem biblioteca, carrinho e
 * pedidos — barrar por role ali obrigava o chef a manter um segundo e-mail
 * para comprar o curso de outro.
 */
export async function requireAuth() {
  const user = await getAuthedUser()
  if (!user) redirect('/login')
  return user
}

export async function requireRole(role: Role) {
  const user = await getAuthedUser()
  if (!user) redirect('/login')
  // 'owner' é um admin com poderes a mais — passa em qualquer gate de admin.
  const atual = roleFromUser(user)
  const efetivo = atual === 'owner' ? 'admin' : atual
  if (efetivo !== role) redirect('/')
  return user
}
