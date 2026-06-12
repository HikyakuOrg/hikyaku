import { SettingsNav } from './settings-nav'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage your account settings and business information.
                </p>
            </div>

            <div className="flex flex-col gap-6 lg:flex-row">
                <aside className="lg:w-60 shrink-0">
                    <SettingsNav />
                </aside>
                <div className="flex-1 lg:max-w-3xl">{children}</div>
            </div>
        </div>
    )
}
