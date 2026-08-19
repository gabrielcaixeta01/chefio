import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * Comissão da plataforma sobre cada matrícula (decisão de negócio 1.1).
 * É o default de `teacher_profiles.commission_rate` no banco (migration 00015)
 * e o fallback quando o professor ainda não tem linha em teacher_profiles.
 * Mudar aqui exige mudar o default no banco junto — os dois têm que bater.
 */
export const COMISSAO_PADRAO = 15

/**
 * Janela de arrependimento do CDC (decisão 2.1). O mesmo prazo está escrito
 * na função `request_refund` (migration 00016) — mudar aqui exige mudar lá.
 */
export const REEMBOLSO_PRAZO_DIAS = 7

/**
 * Até este percentual de aulas concluídas o reembolso sai na hora; acima
 * disso o pedido vai pra fila do admin (decisão 2.1).
 */
export const REEMBOLSO_AUTO_PROGRESSO_MAX = 30

/** Dias que faltam para o fim da janela de reembolso. 0 quando já expirou. */
export function diasRestantesReembolso(matriculadoEm: string | Date): number {
  const limite = new Date(matriculadoEm).getTime() + REEMBOLSO_PRAZO_DIAS * 86_400_000
  return Math.max(0, Math.ceil((limite - Date.now()) / 86_400_000))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min ${s}s`
  return `${s}s`
}

export const COURSE_CATEGORIES = [
  'Culinária Geral',
  'Panificação',
  'Confeitaria',
  'Gastronomia Internacional',
  'Culinária Vegana/Vegetariana',
  'Churrasco e Carnes',
  'Frutos do Mar',
  'Massas',
  'Bebidas e Coquetéis',
  'Nutrição e Alimentação Saudável',
] as const
