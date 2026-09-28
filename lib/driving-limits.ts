import type { DrivingLimitsDto } from "@/lib/api"

/**
 * Driving limit logic for the profile pages and the shift pages.
 *
 * Values are in seconds and metres. Only the profile form and the shift display
 * use hours and kilometres.
 */

/** A driver's limits in seconds and metres. Null means no limit. */
export type DrivingLimits = DrivingLimitsDto

export const NO_DRIVING_LIMITS: DrivingLimits = {
    maxWorkingSeconds: null,
    maxDrivingSeconds: null,
    maxDistanceM: null,
    maxStops: null,
}

/** The four limit columns of a `driving_limit_profile` row. */
export type DrivingLimitValues = {
    max_working_seconds: number | null
    max_driving_seconds: number | null
    max_distance_m: number | null
    max_stops: number | null
}

/** A live `driving_limit_profile` row, as the profile pages and pickers show it. */
export type DrivingLimitProfile = DrivingLimitValues & {
    id: string
    name: string
}

/** The most stops the planner puts on one shift (`MAX_STOPS` in hikyaku-api). A profile cannot go above it. */
export const MAX_STOPS_CEILING = 45

/** Shown while `ShiftDto.drivingLimitsEnabled` is false. */
export const LIMITS_NOT_ENFORCED_NOTE =
    "Automatic assignment does not use driving limits yet. This shift was planned without them."

export function hasAnyDrivingLimit(limits: DrivingLimits): boolean {
    return (
        limits.maxWorkingSeconds != null ||
        limits.maxDrivingSeconds != null ||
        limits.maxDistanceM != null ||
        limits.maxStops != null
    )
}

// ── Form: typed values to stored values ─────────────────────────────────────

const SECONDS_PER_HOUR = 3600
const METRES_PER_KILOMETRE = 1000

export function hoursToSeconds(hours: number): number {
    return Math.round(hours * SECONDS_PER_HOUR)
}

export function kilometresToMetres(kilometres: number): number {
    return Math.round(kilometres * METRES_PER_KILOMETRE)
}

function trimTrailingZeros(text: string): string {
    return text.includes(".") ? text.replace(/\.?0+$/, "") : text
}

/**
 * A stored value as hours input text, blank for no limit. Four decimals round
 * back to the same seconds, so saving an unchanged profile changes nothing.
 */
export function secondsToHoursInput(seconds: number | null): string {
    if (seconds == null) return ""
    return trimTrailingZeros((seconds / SECONDS_PER_HOUR).toFixed(4))
}

/** A stored value as kilometres input text, blank for no limit. */
export function metresToKilometresInput(metres: number | null): string {
    if (metres == null) return ""
    return trimTrailingZeros((metres / METRES_PER_KILOMETRE).toFixed(3))
}

// ── Display ──────────────────────────────────────────────────────────────────

/** Fixed locale, so server and client render the same text. */
function formatNumber(value: number, maximumFractionDigits: number): string {
    return new Intl.NumberFormat("en", { maximumFractionDigits }).format(value)
}

export function formatHours(seconds: number): string {
    return `${formatNumber(seconds / SECONDS_PER_HOUR, 2)} h`
}

export function formatKilometres(metres: number): string {
    return `${formatNumber(metres / METRES_PER_KILOMETRE, 1)} km`
}

export function formatStops(stops: number): string {
    return `${stops} ${stops === 1 ? "stop" : "stops"}`
}

// ── A shift against its limits ───────────────────────────────────────────────

export type LimitDimension = "working" | "driving" | "distance" | "stops"

export const LIMIT_DIMENSION_LABELS: Record<LimitDimension, string> = {
    working: "Working time",
    driving: "Driving time",
    distance: "Distance",
    stops: "Stops",
}

export function formatDimensionValue(dimension: LimitDimension, value: number): string {
    switch (dimension) {
        case "working":
        case "driving":
            return formatHours(value)
        case "distance":
            return formatKilometres(value)
        case "stops":
            return formatStops(value)
    }
}

/** "8.2 h of 10 h", "182 km of 250 km", "31 of 40 stops". */
export function formatUsageAgainstLimit(dimension: LimitDimension, used: number, limit: number): string {
    const usedText = dimension === "stops" ? String(used) : formatDimensionValue(dimension, used)
    return `${usedText} of ${formatDimensionValue(dimension, limit)}`
}

/** Service time per stop (`TIME_PER_STOP` in hikyaku-api), to estimate driving time. */
const SERVICE_SECONDS_PER_STOP = 15 * 60

/** What a planned shift uses, and which values are estimates. */
export type ShiftUsage = {
    /** Depot to depot, service included. Null when the plan has no timings. */
    workingSeconds: number | null
    drivingSeconds: number | null
    /** True when driving time is working time minus service time. */
    drivingIsEstimate: boolean
    /** Null for an old plan with no distance. Not the same as zero. */
    distanceM: number | null
    /** False only when the route distance was measured on roads. */
    distanceIsEstimate: boolean
    stops: number
}

export function shiftUsage(input: {
    /** `arrival` of the plan's start step, in seconds. */
    startArrival: number | null
    /** `arrival` of the plan's end step, in seconds. */
    endArrival: number | null
    /** Total travel `duration` on the end step. Only a full solve writes it. */
    endTravelSeconds: number | null
    stops: number
    distanceM: number | null
    /** `vrp_route.distance_source`: 'estimated', 'measured', or null. */
    distanceSource: string | null
}): ShiftUsage {
    const workingSeconds =
        input.startArrival != null && input.endArrival != null
            ? Math.max(0, input.endArrival - input.startArrival)
            : null

    const measuredDriving = input.endTravelSeconds
    const drivingSeconds =
        measuredDriving ??
        (workingSeconds != null ? Math.max(0, workingSeconds - input.stops * SERVICE_SECONDS_PER_STOP) : null)

    return {
        workingSeconds,
        drivingSeconds,
        drivingIsEstimate: measuredDriving == null,
        distanceM: input.distanceM,
        // No source means estimate.
        distanceIsEstimate: input.distanceSource !== "measured",
        stops: input.stops,
    }
}

/**
 * `unlimited`: no limit. `unknown`: a limit but no plan value. `near`: at or
 * above NEAR_LIMIT_RATIO of the limit.
 */
export type LimitStatus = "unlimited" | "unknown" | "within" | "near" | "over"

/** At this share of a limit, a shift is near it. */
export const NEAR_LIMIT_RATIO = 0.9

export function limitStatus(used: number | null, limit: number | null): LimitStatus {
    if (limit == null) return "unlimited"
    if (used == null) return "unknown"
    if (used > limit) return "over"
    if (used >= limit * NEAR_LIMIT_RATIO) return "near"
    return "within"
}

export type DimensionAssessment = {
    dimension: LimitDimension
    used: number | null
    limit: number | null
    isEstimate: boolean
    status: LimitStatus
}

export function assessShift(usage: ShiftUsage, limits: DrivingLimits): DimensionAssessment[] {
    const rows: Omit<DimensionAssessment, "status">[] = [
        { dimension: "working", used: usage.workingSeconds, limit: limits.maxWorkingSeconds, isEstimate: false },
        { dimension: "driving", used: usage.drivingSeconds, limit: limits.maxDrivingSeconds, isEstimate: usage.drivingIsEstimate },
        { dimension: "distance", used: usage.distanceM, limit: limits.maxDistanceM, isEstimate: usage.distanceIsEstimate },
        { dimension: "stops", used: usage.stops, limit: limits.maxStops, isEstimate: false },
    ]
    return rows.map((row) => ({ ...row, status: limitStatus(row.used, row.limit) }))
}

/** The dimensions over the limit or, if none, near it. */
export function flaggedDimensions(assessments: DimensionAssessment[]): {
    status: "over" | "near" | null
    dimensions: DimensionAssessment[]
} {
    const over = assessments.filter((row) => row.status === "over")
    if (over.length > 0) return { status: "over", dimensions: over }
    const near = assessments.filter((row) => row.status === "near")
    if (near.length > 0) return { status: "near", dimensions: near }
    return { status: null, dimensions: [] }
}
