import Link from 'next/link'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * CTA das páginas públicas. Separado de <Button> de propósito: os dashboards
 * seguem no visual antigo (laranja com texto branco) e não devem mudar junto.
 *
 * O primário é brasa com texto tinta — branco sobre #E85D04 dá 3.3:1 e reprova
 * em contraste; tinta sobre brasa dá 6.4:1.
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
