import { PaymentsClient } from "./payments-client"

export default async function PaymentsSettingsPage() {
    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Payments</h1>
                <p className="text-muted-foreground">
                    Set up your organisation's payment account so you can issue and self-fund your own fuel cards.
                </p>
            </div>
            <PaymentsClient />
        </div>
    )
}
