import { Suspense, use } from 'react'
import { SignUpForm } from '@/components/sign-up-form'

function SignUpContent({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>
}) {
  const { email } = use(searchParams)

  return <SignUpForm defaultEmail={typeof email === 'string' ? email : undefined} />
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>
}) {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Loading...</p>}>
      <SignUpContent searchParams={searchParams} />
    </Suspense>
  )
}
