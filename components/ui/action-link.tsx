import Link from 'next/link'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * CTA das páginas públicas — sempre um <Link>, nunca um <button>.
 *
 * A separação de <Button> não é mais de cor (os dois convergiram no brasa com
 * texto tinta — branco sobre #E85D04 dá 3.3:1 e reprova em contraste; tinta
 * sobre brasa dá 6.4:1). É de papel: aqui existe o `-translate-y-0.5` no hover,
 * que faz sentido num CTA de página de venda e não num botão de formulário.
 *
 * Se precisar de um botão que envia formulário, use <Button loading> — ele tem
 * spinner e trava o duplo clique, que este aqui não tem.
 */
const actionLinkVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 rounded-sm whitespace-nowrap',
  {
    variants: {
      variant: {
        brasa: 'bg-brasa text-tinta hover:bg-brasa-clara hover:-translate-y-0.5',
        cobalto: 'bg-cobalto text-cal hover:bg-cobalto-claro hover:-translate-y-0.5',
        contorno:
          'border-2 border-cobalto text-cobalto hover:bg-cobalto hover:text-cal',
        contornoClaro:
          'border-2 border-cal/40 text-cal hover:border-cal hover:bg-cal hover:text-cobalto',
      },
      size: {
        md: 'h-11 px-5 text-sm',
        lg: 'h-14 px-8 text-base',
      },
    },
    defaultVariants: {
      variant: 'brasa',
      size: 'md',
    },
  }
)

interface ActionLinkProps
  extends VariantProps<typeof actionLinkVariants> {
  href: string
  className?: string
  children: React.ReactNode
}

export function ActionLink({
  href,
  variant,
  size,
  className,
  children,
}: ActionLinkProps) {
  return (
    <Link
      href={href}
      className={cn(actionLinkVariants({ variant, size }), className)}
    >
      {children}
    </Link>
  )
}

export { actionLinkVariants }
