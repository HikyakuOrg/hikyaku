'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { orgPath } from '@/lib/subdomain'
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

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  // Signup collects the account details; verify enters the emailed 6-digit code.
  const [step, setStep] = useState<'signup' | 'verify'>('signup')
  const [otp, setOtp] = useState('')
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  // Shared by the sign-up flow once a live session exists: a signup triggers
  // DB-side creation of an organisations row owned by the new user, so we pick
  // that org's slug and land on its dashboard rather than the apex (where the
  // middleware would bounce to /select-org).
  const redirectToOrg = async () => {
    const supabase = createClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    const userId = userData.user?.id
    if (!userId) throw new Error('No user returned after signup')

    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .select('slug')
      .eq('created_by', userId)
      .limit(1)
      .maybeSingle()
    if (orgError) throw orgError
    const slug = org?.slug
    if (!slug) {
      router.push('/orgs/new')
      return
    }

    router.push(orgPath(slug, '/dashboard'))
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      })
      if (signUpError) throw signUpError

      // Email confirmation is required, so no session exists yet. Move to the
      // OTP screen and let the user confirm with the 6-digit code we emailed.
      setStep('verify')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      })
      if (verifyError) throw verifyError

      // verifyOtp establishes a live session, so the org lookup is authorised.
      await redirectToOrg()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    const supabase = createClient()
    setError(null)
    setResendMessage(null)

    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email })
      if (resendError) throw resendError
      setResendMessage('A new code is on its way.')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  if (step === 'verify') {
    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Enter your code</CardTitle>
            <CardDescription>Almost there — one small step left</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify}>
              <div className="flex flex-col gap-6">
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to{' '}
                  <span className="font-medium text-foreground">{email}</span>. Enter it below to
                  activate your account.
                </p>
                <div className="grid gap-2">
                  <Label htmlFor="otp">Verification code</Label>
                  <Input
                    id="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="123456"
                    required
                    autoFocus
                    className="text-center text-lg tracking-[0.5em]"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                {resendMessage && <p className="text-sm text-green-600">{resendMessage}</p>}
                <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
                  {isLoading ? 'Verifying…' : 'Verify email'}
                </Button>
                <div className="text-center text-sm">
                  Didn&apos;t get a code?{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    className="underline underline-offset-4"
                  >
                    Resend
                  </button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Jane Doe"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@hikyaku.org"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Repeat Password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating an account…' : 'Sign up'}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/auth/login" className="underline underline-offset-4">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
