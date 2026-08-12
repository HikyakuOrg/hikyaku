'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { resolveAuthenticatedDestination } from '@/lib/auth/verify-flow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function UpdatePasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      if (!data.user) throw new Error('No user returned after updating the password')
      // The reset link already established a session, so the org lookup is
      // authorised, so land on the dashboard the same way login does.
      router.push(await resolveAuthenticatedDestination(supabase, data.user.id))
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-8', className)} {...props}>
      <div className="flex flex-col gap-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">
          Set a new password
        </h1>
        <p className="text-muted-foreground text-sm">
          Choose a new password for your Hikyaku account.
        </p>
      </div>

      <form onSubmit={handleForgotPassword} className="flex flex-col gap-5">
        <div className="grid gap-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? 'Saving…' : 'Save new password'}
        </Button>
      </form>
    </div>
  )
}
