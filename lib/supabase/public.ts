import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Client anônimo pra dados públicos (sem cookies()). O client de
 * lib/supabase/server.ts chama cookies(), o que força render dinâmico
 * por request — ruim pra páginas que só precisam de dados públicos e
 * podem ser cacheadas com `revalidate`.
 */
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'
  )
}
