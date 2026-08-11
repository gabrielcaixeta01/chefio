/**
 * Os três cartões numerados de "como funciona".
 *
 * A home e /para-chefs tinham este bloco escrito duas vezes, palavra por
 * palavra — mesmo cartão, mesmo ladrilho de número, mesmas classes. Só o
 * texto mudava. Duplicação assim não quebra nada hoje; ela quebra na próxima
 * vez que alguém ajustar o espaçamento de um lado só.
 */
export function PassosNumerados({
  passos,
}: {
  passos: ReadonlyArray<{ titulo: string; desc: string }>
}) {
  return (
    <ol className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
      {passos.map((passo, i) => (
        <li
          key={passo.titulo}
          className="flex flex-col rounded-md border border-cobalto/15 bg-cal p-8 transition-colors hover:border-cobalto/40"
        >
          <span
            aria-hidden="true"
            className="azulejo-escuro flex h-12 w-12 items-center justify-center rounded-sm font-display text-lg font-extrabold text-cal [--azulejo-tamanho:48px]"
          >
            {String(i + 1).padStart(2, '0')}
          </span>
          <h3 className="mt-6 font-display text-2xl font-bold tracking-tight text-tinta">
            {passo.titulo}
          </h3>
          <p className="mt-3 leading-relaxed text-tinta-suave">{passo.desc}</p>
        </li>
      ))}
    </ol>
  )
}
