import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Tinta sobre brasa, não branco: branco em #E85D04 dá 3.3:1 e reprova
        default: 'bg-brasa text-tinta hover:bg-brasa-clara',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        outline: 'border-2 border-cobalto/25 bg-white text-tinta hover:border-cobalto',
        secondary: 'bg-cobalto text-cal hover:bg-cobalto-claro',
        ghost: 'text-tinta-suave hover:bg-cobalto/10 hover:text-cobalto',
        link: 'text-cobalto underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-3.5 text-xs',
        lg: 'h-14 px-8 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
