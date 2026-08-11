import { Suspense, use } from 'react'
import Link from 'next/link'

function ErrorContent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = use(searchParams)

  return (
    <p className="text-muted-foreground text-sm">
      {params?.error ? `Code error: ${params.error}` : 'An unspecified error occurred.'}
    </p>
  )
}

export default function Page({ searchParams }: { searchParams: Promise<{ error: string }> }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">
          Something went wrong
        </h1>
        <Suspense fallback={<p className="text-muted-foreground text-sm">Loading...</p>}>
          <ErrorContent searchParams={searchParams} />
        </Suspense>
      </div>

      <p className="text-muted-foreground text-center text-sm">
        <Link href="/auth/login" className="text-foreground font-medium underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
