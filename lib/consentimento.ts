/**
 * Consentimento de cookies e medição (decisão 9.5).
 *
 * A decisão é "sim, vamos usar ferramenta de análise/anúncio". Nenhuma
 * dessas ferramentas está instalada ainda — o que existe hoje é o contador
 * da Vercel, que não usa cookie e não identifica ninguém. Este módulo é o
 * portão: qualquer script de medição ou anúncio que entrar depois passa por
 * `consentiuMedicao()`, e não direto no layout.
 *
 * Escolha guardada em localStorage e não em cookie de propósito: guardar a
 * recusa de cookies num cookie é o tipo de piada que aparece em auditoria.
 */

export const CONSENTIMENTO_CHAVE = 'chefio_consentimento'

/**
 * Sobe de versão quando a lista de ferramentas mudar: consentimento dado pra
 * um conjunto de scripts não vale pro conjunto seguinte, e o banner precisa
 * voltar a aparecer.
 */
export const CONSENTIMENTO_VERSAO = 1

export type Consentimento = {
  versao: number
  /** Análise de uso e anúncio. O essencial (sessão, carrinho) não pergunta. */
  medicao: boolean
  em: string
}

export function lerConsentimento(): Consentimento | null {
  if (typeof window === 'undefined') return null
  try {
    const cru = window.localStorage.getItem(CONSENTIMENTO_CHAVE)
    if (!cru) return null
    const valor = JSON.parse(cru) as Consentimento
    if (valor?.versao !== CONSENTIMENTO_VERSAO) return null
    return valor
  } catch {
    return null
  }
}

export function gravarConsentimento(medicao: boolean): Consentimento {
  const valor: Consentimento = {
    versao: CONSENTIMENTO_VERSAO,
    medicao,
    em: new Date().toISOString(),
  }
  try {
    window.localStorage.setItem(CONSENTIMENTO_CHAVE, JSON.stringify(valor))
  } catch {}
  // Quem já está montado precisa saber na hora — `storage` só dispara em
  // outra aba, então o aviso interno é um evento nosso.
  window.dispatchEvent(new CustomEvent(EVENTO_CONSENTIMENTO, { detail: valor }))
  return valor
}

export function limparConsentimento() {
  try {
    window.localStorage.removeItem(CONSENTIMENTO_CHAVE)
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENTO_CONSENTIMENTO, { detail: null }))
}

export const EVENTO_CONSENTIMENTO = 'chefio:consentimento'

export function consentiuMedicao(): boolean {
  return lerConsentimento()?.medicao === true
}
