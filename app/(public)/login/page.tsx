import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'
import { ChefHat } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Login' }

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-orange-600 font-bold text-2xl">
              <ChefHat className="h-7 w-7" />
              Chefio
            </Link>
            <p className="text-gray-500 mt-2 text-sm">Bem-vindo de volta!</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
