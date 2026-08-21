import { parseISO, format } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getShiftUsage, getTrialStatus } from "@/lib/actions/billing"
import { ManageBillingButton } from "./billing-client"

export default async function BillingPage() {
    const [usage, trial] = await Promise.all([getShiftUsage(), getTrialStatus()])

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold tracking-tight">Billing</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage your payment method and view usage for the current billing period.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Payment method</CardTitle>
                    <CardDescription>
                        {usage?.hasPaymentMethod
                            ? "A payment method is on file for overage billing."
                            : "Add a payment method to keep creating shifts once your free allowance runs out."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ManageBillingButton />
                </CardContent>
            </Card>

            {usage && (
                <Card>
                    <CardHeader>
                        <CardTitle>Shift usage</CardTitle>
                        <CardDescription>
                            {usage.shiftsUsedThisPeriod} / {usage.freeAllowance} free shifts used this
                            period. Resets {format(parseISO(usage.periodEnd), "MMM d, yyyy")}.
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}

            {trial && trial.state !== "none" && (
                <Card>
                    <CardHeader>
                        <CardTitle>Trial</CardTitle>
                        <CardDescription>
                            {trial.state === "expired"
                                ? "Your trial has ended."
                                : `${trial.daysRemaining} day${trial.daysRemaining === 1 ? "" : "s"} remaining in your trial.`}
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}
        </div>
    )
}
