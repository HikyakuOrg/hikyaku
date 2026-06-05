import Link from "next/link"
import { XCircle } from "lucide-react"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

export default function BookingCancelPage() {
    return (
        <div className="mx-auto max-w-md space-y-6 py-12 text-center">
            <XCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <div className="space-y-2">
                <h1 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                    Payment cancelled
                </h1>
                <p className="text-muted-foreground leading-7">
                    No charge was made and your booking was not created. You can
                    return and try again whenever you&apos;re ready.
                </p>
            </div>
            <Link href="/booking" className={cn(buttonVariants())}>
                Back to booking
            </Link>
        </div>
    )
}
