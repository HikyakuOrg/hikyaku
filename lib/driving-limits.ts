import type { DrivingLimitsDto } from "@/lib/api"

/**
 * Driving limits: the plain logic the profile pages and the shift pages share.
 *
 * Seconds and metres everywhere, which is what `driving_limit_profile` stores,
 * what hikyaku-api resolves and what the solver consumes. Hours and kilometres
 * exist at exactly two edges, the profile form and the shift display, and the
 * helpers for those edges are the only conversions in this file. Nothing here
 * hands a kilometre to anything but a render.
 */

/**
 * A driver's effective limits, in storage units. Null on a dimension means no
 * limit on it. The shape `ShiftDto.drivingLimits` carries, aliased rather than
 * redeclared so the two cannot drift.
 */
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

/**
 * The most stops the planner will ever put on one shift (`MAX_STOPS` in
 * hikyaku-api's insertion scan). `driving_limit_profile_max_stops_chk` refuses
 * anything above it, because a profile may only tighten that ceiling.
 */
export const MAX_STOPS_CEILING = 45

/**
 * Shown beside a driver's limits while `ShiftDto.drivingLimitsEnabled` is
 * false: the API still returns the configured limits so they can be compared
 * to the plan, but automatic assignment did not apply them.
 */
export const LIMITS_NOT_ENFORCED_NOTE =
    "Automatic assignment is not applying driving limits yet, so this shift was planned without them."

export function hasAnyDrivingLimit(limits: DrivingLimits): boolean {
    return (
        limits.maxWorkingSeconds != null ||
        limits.maxDrivingSeconds != null ||
        limits.maxDistanceM != null ||
        limits.maxStops != null
    )
}

// ── Form edge: what a dispatcher types, to what is stored ───────────────────

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
 * A stored value as the text the hours input shows, blank for no limit.
 *
 * Four decimals of an hour is 0.36 seconds, so `hoursToSeconds` of this text
 * always rounds back to exactly the stored integer. Opening a saved profile and
 * saving it untouched never moves a limit.
 */
export function secondsToHoursInput(seconds: number | null): string {
    if (seconds == null) return ""
    return trimTrailingZeros((seconds / SECONDS_PER_HOUR).toFixed(4))
}

/** A stored value as the text the kilometres input shows, blank for no limit. Exact to the metre. */
export function metresToKilometresInput(metres: number | null): string {
    if (metres == null) return ""
    return trimTrailingZeros((metres / METRES_PER_KILOMETRE).toFixed(3))
}

// ── Display edge ─────────────────────────────────────────────────────────────

/** A fixed locale, so a server render and its hydration print the same digits. */
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

/** "8.2 h of 10 h", "182 km of 250 km", and "31 of 40 stops" rather than "31 stops of 40 stops". */
export function formatUsageAgainstLimit(dimension: LimitDimension, used: number, limit: number): string {
    const usedText = dimension === "stops" ? String(used) : formatDimensionValue(dimension, used)
    return `${usedText} of ${formatDimensionValue(dimension, limit)}`
}

/**
 * Service time the planner books at every stop (`TIME_PER_STOP` in
 * hikyaku-api), used to recover driving time from working time the same way
 * the API's driving-limits diagnostics do.
 */
const SERVICE_SECONDS_PER_STOP = 15 * 60

/** What a planned shift uses, in storage units, with how much of it is a guess. */
export type ShiftUsage = {
    /** Depot to depot, service included. Null when the plan has no timings. */
    workingSeconds: number | null
    drivingSeconds: number | null
    /** True when driving time is working time less service time, not a measured travel figure. */
    drivingIsEstimate: boolean
    /** Null for a plan written before distance was recorded, which is not the same as zero. */
    distanceM: number | null
    /** True unless the route says its distance was measured on the road network. */
    distanceIsEstimate: boolean
    stops: number
}

export function shiftUsage(input: {
    /** `arrival` of the plan's start step, in seconds. */
    startArrival: number | null
    /** `arrival` of the plan's end step, in seconds. */
    endArrival: number | null
    /** Cumulative travel `duration` on the end step, which only a full solve writes. */
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
        // A distance with no stated source is treated as an estimate: calling a
        // straight-line guess measured is the one mistake to avoid here.
        distanceIsEstimate: input.distanceSource !== "measured",
        stops: input.stops,
    }
}

/**
 * `unlimited`: no limit on this dimension. `unknown`: a limit exists but the
 * plan has no figure to compare. `near`: at or past NEAR_LIMIT_RATIO of it.
 */
export type LimitStatus = "unlimited" | "unknown" | "within" | "near" | "over"

/** From this share of a limit upward, a shift reads as close to it. */
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

/** The dimensions a shift is over, or failing that near, its limit on. Empty when neither. */
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
