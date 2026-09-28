import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSupabaseServerClaims } from '@/lib/supabase/server'
import { createOrganisation, listMyOrganisations } from '@/lib/actions/organisations'
import { orgPath } from '@/lib/subdomain'
import { PendingInvitationsDialog } from '@/components/pending-invitations-dialog'
import { listPendingInvitations } from '@/lib/actions/invitations'

export default function OrgsResolverPage() {
    // Reads the session and redirects. This must be inside <Suspense> (cacheComponents).
    return (
        <Suspense fallback={null}>
            <OrgsResolver />
        </Suspense>
    )
}

async function OrgsResolver() {
    const { data: claimsData, error: claimsError } = await getSupabaseServerClaims()
    if (claimsError || !claimsData?.claims?.sub) {
        redirect('/auth/login')
    }

    const [orgs, invitations] = await Promise.all([
        listMyOrganisations(),
        listPendingInvitations(),
    ])

    if (orgs.length > 0) {
        redirect(orgPath(orgs[0].slug, '/dashboard'))
    }

    if (invitations.length > 0) {
        return <PendingInvitationsDialog invitations={invitations} />
    }

    // No org yet (signup did not create one), so create the personal org.
    const created = await createOrganisation(null, 'personal')
    redirect(typeof created === 'string' ? '/orgs/new' : orgPath(created.slug, '/dashboard'))
}
