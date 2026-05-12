'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChefHat, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

type Role = 'student' | 'teacher'

export function RegisterForm() {
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<Role>('student')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }
    if (form.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { name: form.name, role },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="text-center space-y-3">
        <div className="text-5xl">📧</div>
        <h2 className="text-xl font-semibold text-gray-900">Confirme seu email</h2>
        <p className="text-gray-500 text-sm">
          Enviamos um link de confirmação para <strong>{form.email}</strong>.
          Verifique sua caixa de entrada e clique no link para ativar sua conta.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Seleção de role */}
      <div className="space-y-2">
        <Label>Quero me cadastrar como</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole('student')}
            className={cn(
              'flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-sm font-medium transition-colors',
              role === 'student'
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            )}
          >
            <GraduationCap className="h-6 w-6" />
            Aluno
          </button>
          <button
            type="button"
            onClick={() => setRole('teacher')}
            className={cn(
              'flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-sm font-medium transition-colors',
              role === 'teacher'
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            )}
          >
            <ChefHat className="h-6 w-6" />
            Professor
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="name">Nome completo</Label>
        <Input
          id="name"
          placeholder="Seu nome"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="Mínimo 6 caracteres"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="confirmPassword">Confirmar senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Repita a senha"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Criando conta...' : 'Criar conta'}
      </Button>

      <p className="text-center text-sm text-gray-500">
        Já tem conta?{' '}
        <Link href="/login" className="text-orange-600 hover:underline font-medium">
          Faça login
        </Link>
      </p>
    </form>
  )
}
