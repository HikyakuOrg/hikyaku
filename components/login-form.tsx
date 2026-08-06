'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { resolveOrgPath, setPendingVerificationEmail } from '@/lib/auth/verify-flow'

type LoginMode = null | 'email' | 'magic-link'

type LoginFormProps = React.ComponentPropsWithoutRef<'div'> & {
  /** Where to send the user after a successful login, e.g. back to /oauth/consent. */
  redirectTo?: string
}

export function LoginForm({ className, redirectTo, ...props }: LoginFormProps) {
  const [mode, setMode] = useState<LoginMode>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const router = useRouter()

  const handleModeChange = (next: LoginMode) => {
    setMode(next)
    setError(null)
    setMagicLinkSent(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if(!data.user) throw new Error('No user returned after login')

      if (redirectTo) {
        router.push(redirectTo)
        return
      }
      router.push(await resolveOrgPath(supabase, data.user.id))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred'
      // Unconfirmed accounts can't sign in yet — send them to finish OTP verification.
      if (message.toLowerCase().includes('email not confirmed')) {
        setPendingVerificationEmail(email)
        router.push('/auth/verify')
        return
      }
      setError(message)
      setIsLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}${redirectTo ?? '/orgs'}` },
      })
      if (error) throw error
      setMagicLinkSent(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardDescription>Choose how you&apos;d like to sign in</CardDescription>
        </CardHeader>
        <CardContent>
          {mode === null && (
            <div className="flex flex-col gap-3">
              <Button className="w-full" onClick={() => handleModeChange('email')}>
                Email &amp; password
              </Button>
              <Button variant="outline" className="w-full" onClick={() => handleModeChange('magic-link')}>
                Send magic link
              </Button>
            </div>
          )}

          {mode === 'email' && (
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@hikyaku.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/auth/forgot-password"
                      className="ms-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Logging in…' : 'Login'}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => handleModeChange(null)}>
                  Back
                </Button>
              </div>
            </form>
          )}

          {mode === 'magic-link' && (
            <form onSubmit={handleMagicLink}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@whendan.com"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setMagicLinkSent(false) }}
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                {magicLinkSent && (
                  <p className="text-sm text-green-600">Magic link sent — check your inbox.</p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading || magicLinkSent}>
                  {isLoading ? 'Sending…' : 'Send magic link'}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => handleModeChange(null)}>
                  Back
                </Button>
              </div>
            </form>
          )}

          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="underline underline-offset-4">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
