import { redirect } from 'next/navigation'
import { getSupabaseServerClaims } from '@/lib/supabase/server'
import { listMyOrganisations } from '@/lib/actions/organisations'
import { orgPath } from '@/lib/subdomain'
import { PendingInvitationsDialog } from '@/components/pending-invitations-dialog'
import { listPendingInvitations } from '@/lib/actions/invitations'

export default async function OrgsResolverPage() {
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

    redirect('/orgs/new')
}
