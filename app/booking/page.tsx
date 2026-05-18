import { BookingStepper } from "./booking-stepper"

export default function BookingPage() {
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
            <BookingStepper />
        </div>
    )
}
