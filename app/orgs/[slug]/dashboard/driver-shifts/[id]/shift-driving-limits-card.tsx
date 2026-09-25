import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    LIMIT_DIMENSION_LABELS,
    LIMITS_NOT_ENFORCED_NOTE,
    formatDimensionValue,
    formatUsageAgainstLimit,
    type DimensionAssessment,
    type LimitDimension,
} from "@/lib/driving-limits"
import { cn } from "@/lib/utils"

const ESTIMATE_NOTES: Partial<Record<LimitDimension, string>> = {
    driving: "Working time less the 15 minutes booked at each stop, not a measured travel time.",
    distance: "Planned on straight-line distances. It will change when the route is re-solved on the road network.",
}

function figureText(row: DimensionAssessment): string {
    if (row.used == null) {
        // A plan written before distance was recorded has no distance, which is
        // not the same as a zero-kilometre route.
        return row.dimension === "distance" ? "Not recorded" : "Not planned yet"
    }
    return row.limit == null
        ? formatDimensionValue(row.dimension, row.used)
        : formatUsageAgainstLimit(row.dimension, row.used, row.limit)
}

type ShiftDrivingLimitsCardProps = {
    assessments: DimensionAssessment[]
    /** False when the driver's limits could not be read, so no row may claim to be within one. */
    limitsAvailable: boolean
    hasLimits: boolean
    /** Whether automatic assignment is applying driving limits. Null when that is not known. */
    enforced: boolean | null
    /** The driver's page, where their profile is set. Null for a shift with no driver. */
    driverHref: string | null
}

/**
 * The shift's planned working time, driving time, distance and stops against
 * the driver's limits. Values arrive in seconds and metres and are converted
 * here, at the render, and nowhere earlier.
 */
export function ShiftDrivingLimitsCard({
    assessments,
    limitsAvailable,
    hasLimits,
    enforced,
    driverHref,
}: ShiftDrivingLimitsCardProps) {
    return (
        <Card data-testid="shift-driving-limits">
            <CardHeader>
                <CardTitle className="text-lg">Driving Limits</CardTitle>
                <CardDescription>
                    {!limitsAvailable ? (
                        "This driver's limits could not be loaded, so these are the plan's figures alone."
                    ) : hasLimits ? (
                        "What this plan uses against the driver's limits."
                    ) : (
                        <>
                            No driving limits apply to this driver, so these are the plan&apos;s figures alone.
                            {driverHref && (
                                <>
                                    {" "}
                                    <Link href={driverHref} className="underline underline-offset-2 hover:text-foreground">
                                        Set a profile
                                    </Link>
                                </>
                            )}
                        </>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
                {hasLimits && enforced === false && (
                    <p
                        className="mb-3 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
                        data-testid="shift-driving-limits-not-enforced"
                    >
                        {LIMITS_NOT_ENFORCED_NOTE}
                    </p>
                )}

                {assessments.map((row) => {
                    const hasBar = row.limit != null && row.used != null
                    const estimateNote = row.isEstimate && row.used != null ? ESTIMATE_NOTES[row.dimension] : undefined

                    return (
                        <div
                            key={row.dimension}
                            className="space-y-1.5 border-b py-2 last:border-b-0"
                            data-testid={`shift-driving-limit-${row.dimension}`}
                            data-status={row.status}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <span className="flex flex-col">
                                    <span className="text-sm text-muted-foreground">
                                        {LIMIT_DIMENSION_LABELS[row.dimension]}
                                    </span>
                                    {estimateNote && (
                                        <span
                                            className="text-xs text-muted-foreground"
                                            title={estimateNote}
                                            data-testid={`shift-driving-limit-${row.dimension}-estimated`}
                                        >
                                            Estimated
                                        </span>
                                    )}
                                </span>
                                <span className="flex flex-wrap items-center justify-end gap-2 text-right">
                                    {row.status === "over" && <Badge variant="destructive">Over limit</Badge>}
                                    {row.status === "near" && (
                                        <Badge
                                            variant="outline"
                                            className="border-amber-500/60 text-amber-700 dark:text-amber-400"
                                        >
                                            Near limit
                                        </Badge>
                                    )}
                                    <span className="text-sm font-semibold">{figureText(row)}</span>
                                </span>
                            </div>
                            {hasBar && (
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                                    <div
                                        className={cn(
                                            "h-full rounded-full",
                                            row.status === "over"
                                                ? "bg-destructive"
                                                : row.status === "near"
                                                    ? "bg-amber-500"
                                                    : "bg-primary"
                                        )}
                                        style={{ width: `${Math.min(100, ((row.used ?? 0) / (row.limit ?? 1)) * 100)}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}
