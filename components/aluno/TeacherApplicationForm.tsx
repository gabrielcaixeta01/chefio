'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TeacherProfile } from '@/types/database'

/** Aceita CPF (11) ou CNPJ (14) — a decisão 4.2 pede um dos dois. */
const soDigitos = (v: string) => v.replace(/\D/g, '')

const schema = z.object({
  document: z
    .string()
    .refine((v) => [11, 14].includes(soDigitos(v).length), 'Informe um CPF (11 dígitos) ou CNPJ (14).'),
  phone: z
    .string()
    .refine((v) => soDigitos(v).length >= 10, 'Informe DDD e número.'),
  portfolio_url: z
    .string()
    .url('Cole o endereço completo, com https://')
    .or(z.literal('')),
  experience: z.string().min(60, 'Conte um pouco mais — pelo menos 60 caracteres.'),
  bio: z.string().max(400, 'Máximo de 400 caracteres.').or(z.literal('')),
  exclusividade: z.literal(true, { message: 'Sem o aceite não dá pra enviar a candidatura.' }),
})

type FormData = z.infer<typeof schema>

/**
 * Candidatura a professor (decisões 4.2 e 4.5).
 *
 * Mora na área do aluno de propósito: quem está pendente ainda é aluno no
 * banco (o role só vira 'teacher' quando o admin aprova), e desde a 4.3 um
 * aluno de verdade também pode querer ensinar sem abrir outra conta.
 */
export function TeacherApplicationForm({
  userId,
  candidatura,
}: {
  userId: string
  candidatura: TeacherProfile | null
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      document: candidatura?.document ?? '',
      phone: candidatura?.phone ?? '',
      portfolio_url: candidatura?.portfolio_url ?? '',
      experience: candidatura?.experience ?? '',
      bio: candidatura?.bio ?? '',
      exclusividade: !!candidatura?.exclusivity_accepted_at as true,
    },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()

    const campos = {
      document: soDigitos(data.document),
      phone: data.phone.trim(),
      portfolio_url: data.portfolio_url || null,
      experience: data.experience.trim(),
      bio: data.bio || null,
      exclusivity_accepted_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      // Reenvio depois de uma recusa volta pra fila limpa.
      rejection_reason: null,
    }

    // `status` não vai no payload nem na criação: o trigger
    // guard_teacher_profile_insert força 'pending' e a comissão padrão.
    const { error } = candidatura
      ? await supabase.from('teacher_profiles').update(campos).eq('id', candidatura.id)
      : await supabase.from('teacher_profiles').insert({ user_id: userId, ...campos })

    if (error) {
      toast.error(
        error.code === '23505'
          ? 'Você já tem uma candidatura registrada. Atualize a página.'
          : 'Não foi possível enviar. Tente de novo.'
      )
    } else {
      toast.success('Candidatura enviada. A gente responde por e-mail.')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="document">CPF ou CNPJ *</Label>
          <Input id="document" inputMode="numeric" placeholder="Só números" {...register('document')} />
          {errors.document && <p className="text-xs text-red-600">{errors.document.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="phone">Telefone *</Label>
          <Input id="phone" inputMode="tel" placeholder="(11) 99999-0000" {...register('phone')} />
          {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="portfolio_url">Portfólio, site ou Instagram</Label>
        <Input id="portfolio_url" placeholder="https://" {...register('portfolio_url')} />
        <p className="text-xs text-tinta-suave/70">
          Onde a gente vê seu trabalho. Não é obrigatório, mas acelera a análise.
        </p>
        {errors.portfolio_url && <p className="text-xs text-red-600">{errors.portfolio_url.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="experience">Sua experiência na cozinha *</Label>
        <textarea
          id="experience"
          rows={5}
          placeholder="Onde você cozinhou, o que ensina, há quanto tempo."
          className="flex w-full rounded-sm border-2 border-cobalto/20 bg-white px-3.5 py-2.5 text-sm text-tinta transition-colors placeholder:text-tinta-suave/90 hover:border-cobalto/40 focus:border-cobalto focus:outline-none"
          {...register('experience')}
        />
        {errors.experience && <p className="text-xs text-red-600">{errors.experience.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="bio">Bio pública</Label>
        <textarea
          id="bio"
          rows={3}
          placeholder="É o texto que aparece na página dos seus cursos."
          className="flex w-full rounded-sm border-2 border-cobalto/20 bg-white px-3.5 py-2.5 text-sm text-tinta transition-colors placeholder:text-tinta-suave/90 hover:border-cobalto/40 focus:border-cobalto focus:outline-none"
          {...register('bio')}
        />
        {errors.bio && <p className="text-xs text-red-600">{errors.bio.message}</p>}
      </div>

      {/* Decisão 4.5 — a exclusividade é condição de entrada, não letra miúda
          escondida nos termos: fica aqui, do lado do botão que a aceita. */}
      <div className="rounded-sm border-2 border-cobalto/20 bg-cal-fundo p-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-tinta">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-cobalto"
            {...register('exclusividade')}
          />
          <span>
            Concordo em publicar meus cursos da Chefio <strong>só aqui</strong> — não vou vender
            o mesmo conteúdo em outra plataforma enquanto ele estiver no catálogo.
          </span>
        </label>
        {errors.exclusividade && (
          <p className="mt-2 text-xs text-red-600">{errors.exclusividade.message}</p>
        )}
        {/* Decisões 6.1 e 6.2: o curso continua sendo dele e a Chefio pode
            usar trechos na divulgação. Dizer isso aqui é o "avisando" da
            6.2 — o aviso chega antes de existir conteúdo pra divulgar. */}
        <p className="mt-3 text-xs text-tinta-suave/70">
          Seus cursos continuam sendo seus. Ao ensinar aqui você aceita a{' '}
          <a
            href="/politica-de-conteudo"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-cobalto underline-offset-4 hover:underline"
          >
            Política de conteúdo
          </a>
          , que explica a licença de exibição aos alunos e o uso de trechos das aulas na
          divulgação da plataforma.
        </p>
      </div>

      <Button type="submit" size="lg" loading={loading} loadingText="Enviando…">
        {candidatura ? 'Reenviar candidatura' : 'Enviar candidatura'}
      </Button>
    </form>
  )
}
