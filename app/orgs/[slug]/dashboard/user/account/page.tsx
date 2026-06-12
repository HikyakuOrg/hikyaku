import { AccountForm } from './account-form'

export default function AccountPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold tracking-tight">Account</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage your account details.</p>
            </div>

            <AccountForm />
        </div>
    )
}
