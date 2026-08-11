'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GoogleSignIn, isGoogleSignInEnabled } from '@/components/google-sign-in'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LastUsedBadge, useLastAuthMethod } from '@/components/last-used-badge'
import Link from 'next/link'
import { setLastAuthMethod } from '@/lib/auth/last-used'
import { resolveOrgPath, setPendingVerification } from '@/lib/auth/verify-flow'

type LoginFormProps = React.ComponentPropsWithoutRef<'div'> & {
  /** Where to send the user after a successful login, e.g. back to /oauth/consent. */
  redirectTo?: string
}

export function LoginForm({ className, redirectTo, ...props }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const lastUsed = useLastAuthMethod()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (!data.user) throw new Error('No user returned after login')

      setLastAuthMethod('password')
      if (redirectTo) {
        router.push(redirectTo)
        return
      }
      router.push(await resolveOrgPath(supabase, data.user.id))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred'
      // Unconfirmed accounts can't sign in yet, so send them to finish OTP verification.
      if (message.toLowerCase().includes('email not confirmed')) {
        setPendingVerification(email, 'signup', redirectTo)
        router.push('/auth/verify')
        return
      }
      setError(message)
      setIsLoading(false)
    }
  }

  // Passwordless fallback. It reuses the email field above rather than swapping
  // the form out, so the page never collapses to a bare pair of buttons.
  //
  // The Magic Link email template renders {{ .Token }}, not {{ .ConfirmationURL }},
  // so this sends an 8-digit code and hands off to the shared OTP screen. No
  // emailRedirectTo: nothing comes back through a link, so there is no code to
  // exchange and no redirect allow-list entry to keep in sync.
  const handleEmailCode = async () => {
    if (!email) {
      setError('Enter your email address first.')
      return
    }

    const supabase = createClient()
    setIsSendingCode(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error

      setPendingVerification(email, 'signin', redirectTo)
      router.push('/auth/verify')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      setIsSendingCode(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-8', className)} {...props}>
      <div className="flex flex-col gap-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">
          Welcome back
        </h1>
        <p className="text-muted-foreground text-sm">Sign in to your Hikyaku account</p>
      </div>

      {isGoogleSignInEnabled && (
        <>
          <div className="relative">
            {lastUsed === 'google' && <LastUsedBadge />}
            <GoogleSignIn context="signin" redirectTo={redirectTo} onError={setError} />
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-xs">or</span>
            <span className="bg-border h-px flex-1" />
          </div>
        </>
      )}

      <form onSubmit={handleLogin} className="flex flex-col gap-5">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="email@hikyaku.org"
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
              className="text-muted-foreground hover:text-foreground ms-auto inline-block text-sm underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div className="relative">
          {lastUsed === 'password' && <LastUsedBadge />}
          <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </Button>
        </div>
      </form>

      <div className="relative -mt-3">
        {lastUsed === 'email-code' && <LastUsedBadge />}
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={handleEmailCode}
          disabled={isSendingCode}
        >
          {isSendingCode ? 'Sending…' : 'Email me a sign-in code'}
        </Button>
      </div>

      <p className="text-muted-foreground text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" className="text-foreground font-medium underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </div>
  )
}
