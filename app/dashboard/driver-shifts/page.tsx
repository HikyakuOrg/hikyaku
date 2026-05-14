

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Info } from "lucide-react"
import { DriverShiftsCalendar } from "./driver-shifts-calendar"

export default async function DriverShiftsPage() {

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Driver Shifts</h1>
                    <p className="text-muted-foreground">
                        Monitor driver&apos;s shift and optimization results.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button render={<Link href="/dashboard/driver-shifts/add" />}>
                        <Plus className="h-4 w-4" />
                        Add Shift
                    </Button>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-xs text-sm">
                                Shifts are typically created automatically by the route optimiser.
                                Use manual creation only when the scheduler is unavailable or you
                                need to override the optimised route.
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
            <DriverShiftsCalendar />
        </div>
    )
}
