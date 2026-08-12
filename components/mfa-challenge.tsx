'use client'

import { useEffect, useState } from 'react'
import { DeviceMobileIcon, KeyIcon } from '@phosphor-icons/react'

import { createClient } from '@/lib/supabase/client'
import { friendlyWebAuthnError } from '@/lib/auth/webauthn-mfa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FactorSummary = { id: string; friendly_name?: string }
type Factors = { totp: FactorSummary[]; webauthn: FactorSummary[] }
type Method = 'totp' | 'webauthn'

const CODE_LENGTH = 6

/**
 * Shared "prove you have a second factor" UI: picks a method when more than
 * one is enrolled, then walks through a TOTP code or a WebAuthn ceremony.
 * Reused by the login-time challenge page and the settings step-up dialog —
 * those differ only in what happens around this (page chrome vs. a Dialog,
 * sign-out vs. close), not in the challenge itself.
 */
export function MfaChallenge({ onVerified }: { onVerified: () => void }) {
  const [factors, setFactors] = useState<Factors | null>(null)
  const [method, setMethod] = useState<Method | null>(null)
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.mfa.listFactors().then(({ data, error: listError }) => {
      if (listError || !data) {
        setError(listError?.message ?? 'Could not load your two-factor methods.')
        return
      }

      const next: Factors = { totp: data.totp, webauthn: data.webauthn }
      setFactors(next)

      // Nothing left to challenge — a factor removed in another tab, a stale
      // bookmark, etc. There's no second factor to check, so let it through.
      if (next.totp.length === 0 && next.webauthn.length === 0) {
        onVerified()
        return
      }

      if (next.totp.length > 0 && next.webauthn.length === 0) {
        setMethod('totp')
        setSelectedFactorId(next.totp[0].id)
      } else if (next.webauthn.length > 0 && next.totp.length === 0) {
        setMethod('webauthn')
        if (next.webauthn.length === 1) setSelectedFactorId(next.webauthn[0].id)
      }
      // Both types enrolled: leave method unset so the picker below renders.
    })
    // Deliberately one-shot: this loads the factor list for this challenge
    // instance once. onVerified is expected to navigate away or close this UI.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!factors) {
    return error ? (
      <p className="text-destructive text-sm">{error}</p>
    ) : (
      <p className="text-muted-foreground text-sm">Loading…</p>
    )
  }

  if (method === null) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {factors.totp.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setMethod('totp')
              setSelectedFactorId(factors.totp[0].id)
            }}
            className="flex flex-col items-center gap-3 rounded-lg border p-6 text-center hover:border-primary hover:bg-muted transition-colors"
          >
            <DeviceMobileIcon className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Authenticator app</p>
              <p className="text-sm text-muted-foreground mt-1">Enter a code from your authenticator app</p>
            </div>
          </button>
        )}
        {factors.webauthn.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setMethod('webauthn')
              if (factors.webauthn.length === 1) setSelectedFactorId(factors.webauthn[0].id)
            }}
            className="flex flex-col items-center gap-3 rounded-lg border p-6 text-center hover:border-primary hover:bg-muted transition-colors"
          >
            <KeyIcon className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Security key</p>
              <p className="text-sm text-muted-foreground mt-1">Use a security key or built-in authenticator</p>
            </div>
          </button>
        )}
      </div>
    )
  }

  const showBackLink = factors.totp.length > 0 && factors.webauthn.length > 0

  if (method === 'totp') {
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!selectedFactorId) return

      const supabase = createClient()
      setIsSubmitting(true)
      setError(null)

      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: selectedFactorId,
        code,
      })
      if (verifyError) {
        setError(verifyError.message)
        setIsSubmitting(false)
        return
      }
      onVerified()
    }

    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {factors.totp.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {factors.totp.map((factor) => (
              <button
                key={factor.id}
                type="button"
                onClick={() => setSelectedFactorId(factor.id)}
                className={
                  'rounded-md border px-3 py-1.5 text-sm transition-colors ' +
                  (selectedFactorId === factor.id
                    ? 'border-primary bg-primary/5'
                    : 'text-muted-foreground hover:border-primary')
                }
              >
                {factor.friendly_name || 'Authenticator'}
              </button>
            ))}
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="mfa-totp-code">Authenticator code</Label>
          <Input
            id="mfa-totp-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern={`\\d{${CODE_LENGTH}}`}
            maxLength={CODE_LENGTH}
            placeholder="123456"
            required
            autoFocus
            className="h-12 text-center text-lg tracking-[0.4em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting || code.length !== CODE_LENGTH || !selectedFactorId}
        >
          {isSubmitting ? 'Verifying…' : 'Verify'}
        </Button>
        {showBackLink && (
          <button
            type="button"
            onClick={() => {
              setMethod(null)
              setError(null)
              setCode('')
            }}
            className="text-muted-foreground hover:text-foreground text-center text-sm underline underline-offset-4"
          >
            Use a different method
          </button>
        )}
      </form>
    )
  }

  // method === 'webauthn'
  const handleAuthenticate = async (factorId: string) => {
    const supabase = createClient()
    setIsSubmitting(true)
    setError(null)

    const { error: authError } = await supabase.auth.mfa.webauthn.authenticate({ factorId })
    if (authError) {
      setError(friendlyWebAuthnError(authError))
      setIsSubmitting(false)
      return
    }
    onVerified()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        {factors.webauthn.map((factor) => (
          <Button
            key={factor.id}
            type="button"
            variant={factors.webauthn.length > 1 ? 'outline' : 'default'}
            size="lg"
            className="w-full"
            disabled={isSubmitting}
            onClick={() => handleAuthenticate(factor.id)}
          >
            {isSubmitting ? 'Follow your browser’s prompt…' : `Use ${factor.friendly_name || 'security key'}`}
          </Button>
        ))}
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {showBackLink && (
        <button
          type="button"
          onClick={() => {
            setMethod(null)
            setError(null)
          }}
          className="text-muted-foreground hover:text-foreground text-center text-sm underline underline-offset-4"
        >
          Use a different method
        </button>
      )}
    </div>
  )
}
