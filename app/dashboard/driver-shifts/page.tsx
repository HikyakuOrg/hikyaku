

import { DriverShiftsCalendar } from "./driver-shifts-calendar";

export default async function DriverShiftsPage() {
   
    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Driver Shifts</h1>
                <p className="text-muted-foreground">
                    Monitor driver's shift and optimization results.
                </p>
            </div>
            <DriverShiftsCalendar />
        </div>
    )
}