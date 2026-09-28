import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { listConnectedApps, type ConnectedApp } from '@/lib/actions/oauth'
import { userHasCompanyOrg } from '@/lib/actions/organisations'
import { orgPath } from '@/lib/subdomain'
import { ConnectedAppsList } from './connected-apps-list'
import type { OfficialAppId } from './official-apps'

// OAuth client ids differ per Supabase project, so they come from the
// environment. Other clients show under "Other apps".
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
                    Connect hikyaku to the tools you use.
                </p>
            </div>

            {/* Request-time work must be inside Suspense. */}
            <Suspense fallback={<ConnectedAppsSkeleton />}>
                <ConnectedApps params={params} />
            </Suspense>
        </div>
    )
}

async function ConnectedApps({ params }: Props) {
    const { slug } = await params
    // Only company orgs can issue OAuth tokens. Others go back to Account.
    if (!(await userHasCompanyOrg())) redirect(orgPath(slug, '/dashboard/user/account'))

    let apps
    try {
        apps = await listConnectedApps()
    } catch (error) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Could not load connected apps</AlertTitle>
                <AlertDescription>
                    {error instanceof Error ? error.message : 'Try again.'}
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
