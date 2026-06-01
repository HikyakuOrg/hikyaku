import { redirect } from 'next/navigation'
import { listMyOrganisations } from '@/lib/actions/organisations'
import { AccountForm } from './account-form'
import { BusinessInformationClient } from './business-information-client'

type Props = {
    params: Promise<{ slug: string }>
}

export default async function AccountPage({ params }: Props) {
    const { slug } = await params
    const orgs = await listMyOrganisations()
    const current = orgs.find((o) => o.slug === slug)
    if (!current) redirect('/orgs')

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Account</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your account details.</p>
            </div>

            <AccountForm />

            <div className="pt-4">
                <h2 className="text-xl font-semibold tracking-tight">Business Information</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Choose whether this account is personal or for a company. Company
                    accounts can set up payments to issue and fund fuel cards. Company
                    details are managed through Stripe.
                </p>
            </div>
            <BusinessInformationClient
                slug={slug}
                initialOrgType={current.orgType === 'company' ? 'company' : 'personal'}
            />
        </div>
    )
}
