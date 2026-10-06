import type { NextRequest } from 'next/server'

/**
 * Route handlers não têm a proteção contra CSRF que as Server Actions trazem de
 * graça: um site externo consegue montar um <form> que posta para cá com os
 * cookies da pessoa logada. Navegadores sempre mandam `Origin` em POST de
 * formulário, então basta comparar com o host que o atendeu.
 *
 * Sem `Origin` (cliente que não é navegador) deixa passar: CSRF exige o
 * navegador da vítima, e o `Sec-Fetch-Site` cobre o caso raro de navegador que
 * omite o `Origin`.
 */
export function origemConfiavel(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return req.headers.get('sec-fetch-site') !== 'cross-site'

  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
