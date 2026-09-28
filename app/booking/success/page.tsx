import { Suspense } from "react"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

export default function BookingSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ session_id?: string }>
}) {
    return (
        <div className="mx-auto max-w-md space-y-6 py-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <div className="space-y-2">
                <h1 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                    Payment received
                </h1>
                <p className="text-muted-foreground leading-7">
                    Thank you. We received your payment and are confirming your
                    booking. You will get a confirmation soon. Do not pay again.
                </p>
            </div>
            {/* Reading session_id is request-time work, so it must be inside <Suspense>. */}
            <Suspense fallback={null}>
                <BookingReference searchParams={searchParams} />
            </Suspense>
            <Link href="/booking" className={cn(buttonVariants())}>
                Book another delivery
            </Link>
        </div>
    )
}

async function BookingReference({
    searchParams,
}: {
    searchParams: Promise<{ session_id?: string }>
}) {
    // For support only. The Stripe webhook creates the booking, so the user can
    // close this tab.
    const { session_id } = await searchParams

    if (!session_id) return null

    return (
        <p className="text-xs text-muted-foreground break-all">
            Reference: {session_id}
        </p>
    )
}
