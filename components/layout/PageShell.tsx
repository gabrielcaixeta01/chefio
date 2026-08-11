import { cn } from '@/lib/utils'

/**
 * Esqueleto das páginas logadas.
 *
 * A home alterna faixas — cal, cobalto, cal-fundo — e é isso que dá ritmo a
 * ela. Aqui a área logada faz o mesmo em pequeno: o cabeçalho da página é uma
 * faixa de cal que sangra até a borda, o conteúdo cai no cal-fundo abaixo. Sem
 * essa quebra, o título flutuava no cinza e toda página virava uma pilha de
 * caixas iguais.
 */

export function AppShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-cal-fundo lg:flex">
      {sidebar}
      {/* pt-14 abre espaço pra barra fixa do mobile; no desktop o rail é lateral */}
      <main id="conteudo" className="min-w-0 flex-1 pt-14 lg:pt-0">{children}</main>
    </div>
  )
}

/**
 * A faixa em si, sem conteúdo. Existe separada pra que o esqueleto de
 * carregamento possa vestir exatamente a mesma geometria — quando os dois
 * divergiam, a página inteira saltava de lugar assim que o conteúdo chegava.
 */
export function PageHeaderBand({ children }: { children: React.ReactNode }) {
  return (
    <header className="border-b border-cobalto/15 bg-cal">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">{children}</div>
    </header>
  )
}

export function PageHeader({
  olho,
  titulo,
  descricao,
  acoes,
  children,
}: {
  /** Sobretítulo em caixa alta — diz em que parte da casa você está */
  olho: string
  titulo: React.ReactNode
  descricao?: React.ReactNode
  acoes?: React.ReactNode
  /** Barra de ferramentas (busca, filtros). Fica dentro da faixa: é do
      cabeçalho que ela manda, não do conteúdo. */
  children?: React.ReactNode
}) {
  return (
    <PageHeaderBand>
      <>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
          <div className="min-w-0">
            <p className="olho text-brasa-escura">{olho}</p>
            <h1 className="mt-3 font-display text-[clamp(1.85rem,3.4vw,2.6rem)] font-extrabold leading-[1.03] tracking-[-0.02em] text-tinta">
              {titulo}
            </h1>
            {descricao && (
              <p className="mt-2.5 max-w-xl leading-relaxed text-tinta-suave">{descricao}</p>
            )}
          </div>
          {acoes && <div className="flex shrink-0 flex-wrap items-center gap-3">{acoes}</div>}
        </div>
        {children && <div className="mt-7">{children}</div>}
      </>
    </PageHeaderBand>
  )
}

export function PageBody({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('mx-auto max-w-6xl px-5 py-9 sm:px-8 lg:py-11', className)}>{children}</div>
  )
}
