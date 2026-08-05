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

/** Role lido do JWT (app_metadata), sincronizado via trigger — sem SELECT em profiles. */
export function roleFromUser(user: User | null): Role | null {
  return (user?.app_metadata?.role as Role | undefined) ?? null
}

export async function requireRole(role: Role) {
  const user = await getAuthedUser()
  if (!user) redirect('/login')
  if (roleFromUser(user) !== role) redirect('/')
  return user
}
