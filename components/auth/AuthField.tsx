'use client'

import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuthFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  /** Mensagem de erro do campo — some do fluxo quando ausente */
  erro?: string
  /** Adiciona o botão de mostrar/ocultar. Só faz sentido com type="password" */
  revelavel?: boolean
  dica?: string
}

/**
 * Campo das telas públicas de autenticação. Separado de <Input> porque os
 * dashboards continuam no visual antigo (cinza) e não devem mudar junto.
 */
export function AuthField({
  label,
  erro,
  revelavel = false,
  dica,
  className,
  type,
  ...props
}: AuthFieldProps) {
  const id = useId()
  const idErro = `${id}-erro`
  const idDica = `${id}-dica`
  const [revelado, setRevelado] = useState(false)

  const tipoFinal = revelavel && revelado ? 'text' : type

  const descrito = [erro ? idErro : null, dica ? idDica : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-semibold text-tinta"
      >
        {label}
      </label>

      <div className="relative">
        <input
          {...props}
          id={id}
          type={tipoFinal}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descrito || undefined}
          className={cn(
            'h-12 w-full rounded-sm border-2 bg-white px-3.5 text-tinta transition-colors',
            'placeholder:text-tinta-suave/60',
            'focus:outline-none focus:border-cobalto',
            erro ? 'border-red-600' : 'border-cobalto/20 hover:border-cobalto/40',
            revelavel && 'pr-12',
            className
          )}
        />

        {revelavel && (
          <button
            type="button"
            onClick={() => setRevelado((v) => !v)}
            aria-label={revelado ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-tinta-suave transition-colors hover:text-cobalto"
          >
            {revelado ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        )}
      </div>

      {dica && !erro && (
        <p id={idDica} className="text-xs text-tinta-suave">
          {dica}
        </p>
      )}

      {erro && (
        <p id={idErro} role="alert" className="text-xs font-medium text-red-700">
          {erro}
        </p>
      )}
    </div>
  )
}
