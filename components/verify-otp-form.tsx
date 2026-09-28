'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { setLastAuthMethod } from '@/lib/auth/last-used'
import {
  clearPendingVerification,
  getPendingVerification,
  resolveAuthenticatedDestination,
  type VerificationIntent,
} from '@/lib/auth/verify-flow'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const OTP_LENGTH = 8

export function VerifyOtpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const router = useRouter()
  // null: not read yet. '' is a real state with its own screen, so do not show
  // it before the read.
  const [email, setEmail] = useState<string | null>(null)
  const [intent, setIntent] = useState<VerificationIntent>('signup')
  const [redirectTo, setRedirectTo] = useState<string | undefined>()
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Read the pending record after mount (localStorage is client only).
  useEffect(() => {
    const pending = getPendingVerification()
    setEmail(pending.email)
    setIntent(pending.intent)
    setRedirectTo(pending.redirectTo)
  }, [])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      })
      if (verifyError) throw verifyError
      const userId = data.user?.id
      if (!userId) throw new Error('No user returned after verification')

      // Verified, so the pending record is no longer needed.
      clearPendingVerification()
      // After signup the user has a password. Only passwordless sign-in counts
      // as the code method.
      setLastAuthMethod(intent === 'signin' ? 'email-code' : 'password')
      // verifyOtp creates a session, so the org lookup works.
      router.push(await resolveAuthenticatedDestination(supabase, userId, redirectTo))
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) return

    const supabase = createClient()
    setError(null)
    setResendMessage(null)

    try {
      // Signup and passwordless sign-in send codes through different endpoints.
      const { error: resendError } =
        intent === 'signin'
          ? await supabase.auth.signInWithOtp({ email })
          : await supabase.auth.resend({ type: 'signup', email })
      if (resendError) throw resendError
      setResendMessage('A new code is on its way.')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  // Wait for the read above.
  if (email === null) return null

  // No pending email (direct link or cleared storage), so nothing to verify.
  if (email === '') {
    return (
      <div className={cn('flex flex-col gap-8', className)} {...props}>
        <div className="flex flex-col gap-2">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">
            Nothing to verify
          </h1>
          <p className="text-muted-foreground text-sm">
            No sign-in on this device is waiting for a code. Sign in again to get a new code.
          </p>
        </div>
        <Link href="/auth/login" className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-8', className)} {...props}>
      <div className="flex flex-col gap-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">
          Check your email
        </h1>
        <p className="text-muted-foreground text-sm">
          We sent an {OTP_LENGTH}-digit code to{' '}
          <span className="text-foreground font-medium break-all">{email}</span>. Enter it to{' '}
          {intent === 'signin' ? 'sign in' : 'activate your account'}.
        </p>
      </div>

      <form onSubmit={handleVerify} className="flex flex-col gap-5">
        <div className="grid gap-2">
          <Label htmlFor="otp">Verification code</Label>
          <Input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern={`\\d{${OTP_LENGTH}}`}
            maxLength={OTP_LENGTH}
            placeholder="12345678"
            required
            autoFocus
            className="h-12 text-center text-lg tracking-[0.4em]"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        {resendMessage && <p className="text-sm text-green-600">{resendMessage}</p>}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isLoading || otp.length !== OTP_LENGTH}
        >
          {isLoading ? 'Verifying…' : intent === 'signin' ? 'Sign in' : 'Verify email'}
        </Button>
      </form>

      <div className="text-muted-foreground flex flex-col gap-2 text-center text-sm">
        <p>
          Didn&apos;t get a code?{' '}
          <button
            type="button"
            onClick={handleResend}
            className="text-foreground font-medium underline underline-offset-4"
          >
            Resend
          </button>
        </p>
        <p>
          Wrong address?{' '}
          <Link href="/auth/login" className="underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
