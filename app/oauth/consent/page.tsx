import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient, getSupabaseServerClaims } from '@/lib/supabase/server'
import { submitOAuthDecision } from '@/lib/actions/oauth'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const SCOPE_LABELS: Record<string, string> = {
  openid: 'Verify your identity',
  email: 'View your email address',
  profile: 'View your basic profile info',
  phone: 'View your phone number',
}

type ConsentSearchParams = Promise<{ authorization_id?: string }>

export default function OAuthConsentPage({
  searchParams,
}: {
  searchParams: ConsentSearchParams
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {/* Request-time work (cookies, Supabase calls) must sit inside a
            Suspense boundary — see app/orgs/page.tsx for the same pattern. */}
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <ConsentContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  )
}

async function ConsentContent({ searchParams }: { searchParams: ConsentSearchParams }) {
  const { authorization_id: authorizationId } = await searchParams

  if (!authorizationId) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Missing authorization request</AlertTitle>
        <AlertDescription>
          This page must be reached from a third-party application&apos;s sign-in link.
        </AlertDescription>
      </Alert>
    )
  }

  // Middleware already redirects anonymous traffic to /auth/login, but every
  // protected route in this app re-checks claims server-side too (see
  // app/orgs/[slug]/dashboard/layout.tsx) rather than trusting middleware alone.
  const { data: claimsData, error: claimsError } = await getSupabaseServerClaims()
  if (claimsError || !claimsData?.claims?.sub) {
    const destination = `/oauth/consent?${new URLSearchParams({ authorization_id: authorizationId })}`
    redirect(`/auth/login?redirect=${encodeURIComponent(destination)}`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId)

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Invalid authorization request</AlertTitle>
        <AlertDescription>
          {error?.message ??
            'This sign-in link is invalid or has expired. Ask the application to send a new one.'}
        </AlertDescription>
      </Alert>
    )
  }

  // Already consented to these scopes — Supabase hands back a redirect_url
  // directly rather than authorization details, so send them straight back.
  if (!('authorization_id' in data)) {
    redirect(data.redirect_url)
  }

  const scopes = data.scope?.trim() ? data.scope.trim().split(/\s+/) : []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {data.client.logo_uri && (
            <img
              src={data.client.logo_uri}
              alt=""
              referrerPolicy="no-referrer"
              className="size-10 shrink-0 rounded-md object-contain"
            />
          )}
          <div>
            <CardTitle className="text-lg">{data.client.name}</CardTitle>
            <CardDescription>wants to access your hikyaku account</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{data.user.email}</span>
        </p>
        {scopes.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">This will allow {data.client.name} to:</p>
            <ul className="flex flex-col gap-1.5">
              {scopes.map((scope) => (
                <li key={scope} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="shrink-0">
                    {scope}
                  </Badge>
                  {SCOPE_LABELS[scope] ?? scope}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          You&apos;ll be redirected to {data.redirect_uri}
        </p>
      </CardContent>
      <CardFooter>
        <form action={submitOAuthDecision} className="flex w-full gap-2">
          <input type="hidden" name="authorization_id" value={authorizationId} />
          <Button type="submit" name="decision" value="deny" variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button type="submit" name="decision" value="approve" className="flex-1">
            Allow
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
