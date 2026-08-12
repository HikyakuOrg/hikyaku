import { Suspense, use } from 'react'
import { MfaChallengeForm } from '@/components/mfa-challenge-form'
import { isSafeRedirectPath } from '@/lib/auth/verify-flow'

function MfaContent({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const { redirect } = use(searchParams)
  const redirectTo = isSafeRedirectPath(redirect) ? redirect : undefined

  return <MfaChallengeForm redirectTo={redirectTo} />
}

// Layout (app/auth/layout.tsx) supplies the split shell, wordmark and centring.
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Loading...</p>}>
      <MfaContent searchParams={searchParams} />
    </Suspense>
  )
}
