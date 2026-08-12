'use client'

import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { MfaChallenge } from '@/components/mfa-challenge'

type MfaChallengeFormProps = React.ComponentPropsWithoutRef<'div'> & {
  /** Fully-resolved destination, already computed by resolveAuthenticatedDestination. */
  redirectTo?: string
}

export function MfaChallengeForm({ className, redirectTo, ...props }: MfaChallengeFormProps) {
  const router = useRouter()

  const handleVerified = () => {
    router.push(redirectTo ?? '/orgs')
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className={cn('flex flex-col gap-8', className)} {...props}>
      <div className="flex flex-col gap-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">
          Verify it&apos;s you
        </h1>
        <p className="text-muted-foreground text-sm">
          Your account has two-factor authentication enabled. Confirm it&apos;s you to continue.
        </p>
      </div>

      <MfaChallenge onVerified={handleVerified} />

      <p className="text-muted-foreground text-center text-sm">
        Can&apos;t complete this?{' '}
        <button
          type="button"
          onClick={handleSignOut}
          className="text-foreground font-medium underline underline-offset-4"
        >
          Sign out
        </button>
      </p>
    </div>
  )
}
