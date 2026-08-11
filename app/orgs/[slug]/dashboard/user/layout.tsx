import { getOrganisationType } from '@/lib/actions/organisations'
import { SettingsNav } from './settings-nav'

type SettingsLayoutProps = {
    children: React.ReactNode
    params: Promise<{ slug: string }>
}

export default async function SettingsLayout({ children, params }: SettingsLayoutProps) {
    const { slug } = await params
    // Business Information is company-only; personal orgs never see the tab.
    const isCompany = (await getOrganisationType(slug)) === 'company'

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
                    <SettingsNav showBusinessInformation={isCompany} />
                </aside>
                <div className="flex-1 lg:max-w-3xl">{children}</div>
            </div>
        </div>
    )
}
