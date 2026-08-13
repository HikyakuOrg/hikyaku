import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { listConnectedApps } from '@/lib/actions/oauth'
import { userHasCompanyOrg } from '@/lib/actions/organisations'
import { orgPath } from '@/lib/subdomain'
import { ConnectedAppsList } from './connected-apps-list'

type Props = {
    params: Promise<{ slug: string }>
}

export default function ConnectedAppsPage({ params }: Props) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold tracking-tight">Connected Apps</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Third-party apps you have given access to your hikyaku account. Revoking
                    an app signs it out everywhere and forces it to ask for access again.
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

    return <ConnectedAppsList slug={slug} apps={apps} />
}

function ConnectedAppsSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
        </div>
    )
}
