

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Info } from "lucide-react"
import { DriverShiftsCalendar } from "./driver-shifts-calendar"
import { OptimiseRoutesButton } from "./optimise-routes-button"

export default async function DriverShiftsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Driver Shifts</h1>
                    <p className="text-muted-foreground">
                        See driver shifts and their routes.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <OptimiseRoutesButton />
                    <Button render={<Link href={`/orgs/${slug}/dashboard/driver-shifts/add`} />}>
                        <Plus className="h-4 w-4" />
                        Add Shift
                    </Button>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-xs text-sm">
                                Shifts are usually created automatically: a new package goes on an
                                open shift, or starts a new one when no shift has space. Add a shift
                                yourself to book a driver and vehicle early, or to change the route.
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
            <DriverShiftsCalendar />
        </div>
    )
}
