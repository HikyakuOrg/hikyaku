import { redirect } from 'next/navigation'
import { getOrganisationType, getOrganisationVanitySlug, getOrganisationBranding } from '@/lib/actions/organisations'
import { getVanityUrlStatus } from '@/lib/actions/billing'
import { orgPath, tenantUrl } from '@/lib/subdomain'
import { BusinessInformationClient } from './business-information-client'
import { VanityUrlSection } from '@/components/settings/vanity-url-section'
import { LogoSection } from '@/components/settings/logo-section'

type Props = {
    params: Promise<{ slug: string }>
}

export default async function BusinessInformationPage({ params }: Props) {
    const { slug } = await params
    const orgType = await getOrganisationType(slug)
    if (!orgType) redirect('/orgs')
    // Personal orgs have no business details — the nav hides this section, and
    // direct navigation lands back on Account.
    if (orgType !== 'company') redirect(orgPath(slug, '/dashboard/user/account'))

    const [vanitySlug, vanityStatus, branding] = await Promise.all([
        getOrganisationVanitySlug(slug),
        getVanityUrlStatus(),
        getOrganisationBranding(slug),
    ])

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold tracking-tight">Business Information</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Set up payments to issue and fund fuel cards. Company details
                    are managed through Stripe.
                </p>
            </div>
            {branding && (
                <LogoSection
                    slug={slug}
                    organisationId={branding.id}
                    initialLogoUrl={branding.logoUrl}
                />
            )}
            <VanityUrlSection
                vanityUrl={vanitySlug ? tenantUrl(vanitySlug, '/booking') : null}
                hasVanityUrlEntitlement={vanityStatus?.hasVanityUrlEntitlement ?? false}
            />
            <BusinessInformationClient />
        </div>
    )
}
