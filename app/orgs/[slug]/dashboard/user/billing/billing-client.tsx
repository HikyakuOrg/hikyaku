"use client"

import { useState } from "react"
import { CreditCard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBillingPortalSession } from "@/lib/actions/billing"
import { getErrorMessage } from "@/lib/utils"
import { toast } from "sonner"

/** Opens the Stripe Billing Portal to change the payment method or see invoices. */
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
            toast.error(getErrorMessage(err) || "Could not open the billing portal.")
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
