import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { listConnectedApps, type ConnectedApp } from '@/lib/actions/oauth'
import { userHasCompanyOrg } from '@/lib/actions/organisations'
import { orgPath } from '@/lib/subdomain'
import { ConnectedAppsList } from './connected-apps-list'
import type { OfficialAppId } from './official-apps'

// OAuth client IDs differ per Supabase project (local, staging, prod), so they
// come from the environment. A grant whose client isn't listed here shows under
// "Other apps" instead of borrowing an official app's branding.
const OFFICIAL_APP_CLIENT_IDS: Record<OfficialAppId, string | undefined> = {
    n8n: process.env.N8N_OAUTH_CLIENT_ID,
    shopify: process.env.SHOPIFY_OAUTH_CLIENT_ID,
}

type Props = {
    params: Promise<{ slug: string }>
}

export default function ConnectedAppsPage({ params }: Props) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold tracking-tight">Connected Apps</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Connect hikyaku to the tools you already use. Revoking an app signs it out
                    everywhere and forces it to ask for access again.
                </p>
            </div>

            {/* Request-time work (cookies, Supabase calls) must sit inside a
                Suspense boundary — same pattern as app/oauth/consent/page.tsx. */}
            <Suspense fallback={<ConnectedAppsSkeleton />}>
                <ConnectedApps params={params} />
            </Suspense>
        </div>
    )
}

async function ConnectedApps({ params }: Props) {
    const { slug } = await params
    // OAuth token issuance is organisation-only — the nav hides this section
    // for personal accounts, and direct navigation lands back on Account.
    if (!(await userHasCompanyOrg())) redirect(orgPath(slug, '/dashboard/user/account'))

    let apps
    try {
        apps = await listConnectedApps()
    } catch (error) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Could not load connected apps</AlertTitle>
                <AlertDescription>
                    {error instanceof Error ? error.message : 'Please try again.'}
                </AlertDescription>
            </Alert>
        )
    }

    const officialGrants: Partial<Record<OfficialAppId, ConnectedApp>> = {}
    const otherApps: ConnectedApp[] = []
    for (const app of apps) {
        const officialId = (Object.keys(OFFICIAL_APP_CLIENT_IDS) as OfficialAppId[]).find(
            (id) => OFFICIAL_APP_CLIENT_IDS[id] === app.clientId,
        )
        if (officialId) officialGrants[officialId] = app
        else otherApps.push(app)
    }

    return <ConnectedAppsList slug={slug} officialGrants={officialGrants} otherApps={otherApps} />
}

function ConnectedAppsSkeleton() {
    return (
        <Skeleton className="h-40 w-full rounded-xl" />
    )
}
