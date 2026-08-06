import { Suspense, use } from 'react'
import { LoginForm } from '@/components/login-form'
import { isSafeRedirectPath } from '@/lib/auth/verify-flow'

function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const { redirect } = use(searchParams)
  const redirectTo = isSafeRedirectPath(redirect) ? redirect : undefined

  return <LoginForm redirectTo={redirectTo} />
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}>
          <LoginContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  )
}
