import { ShiftStepperForm } from "./stepper-form"

export default function AddDriverShiftPage() {
    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Create Manual Shift</h1>
                <p className="text-muted-foreground">
                    Manually assign a driver, vehicle, and delivery route for a shift.
                </p>
            </div>
            <ShiftStepperForm />
        </div>
    )
}
