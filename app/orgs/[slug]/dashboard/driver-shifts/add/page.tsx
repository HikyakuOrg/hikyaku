import { getShiftUsage } from "@/lib/actions/billing"
import { ShiftStepperForm } from "./stepper-form"

export default async function AddDriverShiftPage() {
    // For the warning on the Overview step. A DB trigger enforces the allowance.
    const usage = await getShiftUsage()

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Create Manual Shift</h1>
                <p className="text-muted-foreground">
                    Choose the driver, vehicle and packages for a shift.
                </p>
            </div>
            <ShiftStepperForm usage={usage} />
        </div>
    )
}
