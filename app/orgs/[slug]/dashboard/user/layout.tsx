import { getOrganisationType, userHasCompanyOrg } from '@/lib/actions/organisations'
import { SettingsNav } from './settings-nav'

type SettingsLayoutProps = {
    children: React.ReactNode
    params: Promise<{ slug: string }>
}

export default async function SettingsLayout({ children, params }: SettingsLayoutProps) {
    const { slug } = await params
    // Business Information is company-only; personal orgs never see the tab.
    const [isCompany, hasCompanyOrg] = await Promise.all([
        getOrganisationType(slug).then((type) => type === 'company'),
        // Connected Apps/OAuth grants are per-user, not per-org — gate on
        // whether the account has a company org at all, not the org in the
        // URL, so a company-org member browsing their personal org still sees it.
        userHasCompanyOrg(),
    ])

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {isCompany
                        ? 'Manage your account settings and business information.'
                        : 'Manage your account settings.'}
                </p>
            </div>

            <div className="flex flex-col gap-6 lg:flex-row">
                <aside className="lg:w-60 shrink-0">
                    <SettingsNav showBusinessInformation={isCompany} showConnectedApps={hasCompanyOrg} />
                </aside>
                <div className="flex-1 lg:max-w-3xl">{children}</div>
            </div>
        </div>
    )
}
