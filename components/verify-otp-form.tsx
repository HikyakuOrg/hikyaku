'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  clearPendingVerificationEmail,
  getPendingVerificationEmail,
  resolveOrgPath,
  setPendingVerificationEmail,
} from '@/lib/auth/verify-flow'
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

const OTP_LENGTH = 8

export function VerifyOtpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Rehydrate the pending email after mount (localStorage is client-only). This
  // is what lets the screen resume after a refresh or navigating away.
  useEffect(() => {
    setEmail(getPendingVerificationEmail())
  }, [])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
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

      // Verified — the pending record is no longer needed.
      clearPendingVerificationEmail()
      // verifyOtp establishes a live session, so the org lookup is authorised.
      router.push(await resolveOrgPath(supabase, userId))
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

    if (!email) {
      setError('Enter your email address first.')
      return
    }

    try {
      // Keep the stored email in sync in case the user corrected it here.
      setPendingVerificationEmail(email)
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email })
      if (resendError) throw resendError
      setResendMessage('A new code is on its way.')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

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
                We sent an {OTP_LENGTH}-digit code to the email below. Enter it to activate your
                account.
              </p>
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
                  className="text-center text-lg tracking-[0.4em]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {resendMessage && <p className="text-sm text-green-600">{resendMessage}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || otp.length !== OTP_LENGTH}
              >
                {isLoading ? 'Verifying…' : 'Verify email'}
              </Button>
              <div className="text-center text-sm">
                Didn&apos;t get a code?{' '}
                <button type="button" onClick={handleResend} className="underline underline-offset-4">
                  Resend
                </button>
              </div>
              <div className="text-center text-sm">
                <Link href="/auth/login" className="underline underline-offset-4">
                  Back to login
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
