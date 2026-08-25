import { getShiftUsage } from "@/lib/actions/billing"
import { ShiftStepperForm } from "./stepper-form"

export default async function AddDriverShiftPage() {
    // Read-only pre-check, not the enforcement point — enforce_shift_allowance()
    // in hikyaku-api (the DB trigger) is what actually blocks the insert. This
    // only lets the Overview step warn before a submission that would fail, the
    // same relationship getWarehouseAllowance() has to the warehouse limit.
    const usage = await getShiftUsage()

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Create Manual Shift</h1>
                <p className="text-muted-foreground">
                    Manually assign a driver, vehicle, and delivery route for a shift.
                </p>
            </div>
            <ShiftStepperForm usage={usage} />
        </div>
    )
}
