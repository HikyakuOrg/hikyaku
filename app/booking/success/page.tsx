import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function BookingSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ session_id?: string }>
}) {
    // session_id is available for support/debugging only. Fulfillment (creating
    // the customer + package) happens server-side via the Stripe webhook, never
    // from this page — the user may close the tab before it loads.
    const { session_id } = await searchParams

    return (
        <div className="mx-auto max-w-md space-y-6 py-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <div className="space-y-2">
                <h1 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                    Payment received
                </h1>
                <p className="text-muted-foreground leading-7">
                    Thanks! Your payment was successful and we&apos;re confirming
                    your booking now. You&apos;ll get a confirmation shortly —
                    no need to pay again.
                </p>
            </div>
            {session_id && (
                <p className="text-xs text-muted-foreground break-all">
                    Reference: {session_id}
                </p>
            )}
            <Link href="/booking" className={cn(buttonVariants())}>
                Book another delivery
            </Link>
        </div>
    )
}
