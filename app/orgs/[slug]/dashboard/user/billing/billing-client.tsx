"use client"

import { useState } from "react"
import { CreditCard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBillingPortalSession } from "@/lib/actions/billing"
import { getErrorMessage } from "@/lib/utils"
import { toast } from "sonner"

/**
 * Redirects to Stripe's hosted Billing Portal. This is the one persistent,
 * discoverable entry point to add/update a payment method or view invoices —
 * the only other place that links here (the driver-shift Overview step) only
 * appears once the free allowance is already exhausted.
 */
export function ManageBillingButton() {
    const [isLoading, setIsLoading] = useState(false)

    async function handleClick() {
        setIsLoading(true)
        try {
            const result = await createBillingPortalSession(window.location.href)
            if (!result.success) {
                toast.error(result.error)
                return
            }
            window.location.href = result.url
        } catch (err) {
            toast.error(getErrorMessage(err) || "Failed to open the billing portal")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button onClick={handleClick} disabled={isLoading}>
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening billing portal...
                </>
            ) : (
                <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Manage billing
                </>
            )}
        </Button>
    )
}
