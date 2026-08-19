/**
 * Frete por CEP (decisão 8.2).
 *
 * A decisão pede cálculo por CEP com integração de transportadora. Até a
 * conta dos Correios existir, o valor sai desta tabela por faixa de CEP —
 * é o mesmo formato que a API devolve (valor + prazo), então trocar a fonte
 * é trocar o corpo de `cotarFrete` e nada mais: checkout, pedido e telas já
 * falam em `{ valor, dias }`.
 *
 * A cotação é congelada no pedido (`orders.shipping_cost`). Recotizar depois
 * mudaria o total de uma compra já paga.
 */

export type CotacaoFrete = {
  valor: number
  dias: number
  regiao: string
}

/**
 * Primeiro dígito do CEP = macrorregião dos Correios. Os valores são uma
 * estimativa de PAC pra encomenda pequena — provisórios, e é isso que a
 * integração real substitui.
 */
const FAIXAS: Record<string, { regiao: string; base: number; porItem: number; dias: number }> = {
  '0': { regiao: 'São Paulo (capital)', base: 18.9, porItem: 4.5, dias: 3 },
  '1': { regiao: 'São Paulo (interior)', base: 19.9, porItem: 4.5, dias: 4 },
  '2': { regiao: 'Rio de Janeiro e Espírito Santo', base: 21.9, porItem: 5, dias: 4 },
  '3': { regiao: 'Minas Gerais', base: 22.9, porItem: 5, dias: 5 },
  '4': { regiao: 'Bahia e Sergipe', base: 32.9, porItem: 6.5, dias: 8 },
  '5': { regiao: 'Pernambuco, Alagoas, Paraíba e Rio Grande do Norte', base: 34.9, porItem: 7, dias: 9 },
  '6': { regiao: 'Norte, Ceará, Piauí e Maranhão', base: 39.9, porItem: 8, dias: 11 },
  '7': { regiao: 'Centro-Oeste e Rondônia', base: 29.9, porItem: 6, dias: 7 },
  '8': { regiao: 'Paraná e Santa Catarina', base: 26.9, porItem: 5.5, dias: 6 },
  '9': { regiao: 'Rio Grande do Sul', base: 26.9, porItem: 5.5, dias: 6 },
}

/** Só os dígitos. Aceita "01310-100", "01310100" e o que o teclado deixar passar. */
export function normalizarCep(cep: string): string {
  return (cep ?? '').replace(/\D/g, '').slice(0, 8)
}

export function cepValido(cep: string): boolean {
  return normalizarCep(cep).length === 8
}

/** "01310100" → "01310-100". Devolve o que entrou quando ainda está incompleto. */
export function formatarCep(cep: string): string {
  const digitos = normalizarCep(cep)
  if (digitos.length <= 5) return digitos
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`
}

/**
 * Decisão 8.7: entregamos em todo o Brasil, então toda faixa de CEP tem
 * preço — nenhuma combinação devolve "não atendemos aí".
 */
export function cotarFrete(cep: string, quantidadeItens: number): CotacaoFrete | null {
  const digitos = normalizarCep(cep)
  if (digitos.length !== 8) return null

  const faixa = FAIXAS[digitos[0]]
  if (!faixa) return null

  // O primeiro item já está na base; a partir do segundo entra o adicional.
  const extras = Math.max(0, Math.floor(quantidadeItens) - 1)
  const valor = faixa.base + extras * faixa.porItem

  return {
    valor: Math.round(valor * 100) / 100,
    dias: faixa.dias,
    regiao: faixa.regiao,
  }
}
