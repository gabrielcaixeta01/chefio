import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function createClient() {
  // `NEXT_PUBLIC_*` é inlinado em BUILD TIME. Se as variáveis não estavam no
  // ambiente quando o deploy buildou, aqui chega `undefined` — e o erro real
  // ("Invalid URL") aparece lá dentro do @supabase/ssr, no meio do submit do
  // login, sem citar o que faltou. O site inteiro continua abrindo, porque os
  // clients de servidor caem num placeholder; só a autenticação morre.
  // Falhar com o nome da variável é o que transforma isso numa correção de
  // dois minutos em vez de uma caçada.
  if (!url || !anonKey) {
    throw new Error(
      'Supabase não configurado no browser: defina NEXT_PUBLIC_SUPABASE_URL e ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY no ambiente de BUILD do deploy. ' +
        'Mudar a variável sem refazer o build não tem efeito — elas são ' +
        'embutidas no bundle na hora da compilação.'
    )
  }

  return createBrowserClient<Database>(url, anonKey)
}
