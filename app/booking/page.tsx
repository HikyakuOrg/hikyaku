import { BookingStepper } from "./booking-stepper"
import { getServiceRates } from "@/lib/supabase/db-server"

export default async function BookingPage() {
    const serviceRates = await getServiceRates()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                    Schedule a Delivery
                </h1>
                <p className="text-muted-foreground mt-1">
                    Fill in your package and delivery details to get started.
                </p>
            </div>
            <BookingStepper serviceRates={serviceRates} />
        </div>
    )
}
