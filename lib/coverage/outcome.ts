/**
 * Labels for `package_assignment.coverage_outcome`, shared by the package
 * detail, package list and shift detail pages. Keep the values in sync with
 * COVERAGE_OUTCOMES in hikyaku-api (src/dispatch/coverage.ts).
 */
export const COVERAGE_OUTCOMES = [
    "covered",
    "floater",
    "fallback_no_covering_capacity",
    "fallback_no_covering_driver",
    "disabled",
] as const

export type CoverageOutcome = (typeof COVERAGE_OUTCOMES)[number]

/** The two outcomes where a package did not go to a driver who covers it. */
export const FALLBACK_OUTCOMES: readonly CoverageOutcome[] = [
    "fallback_no_covering_capacity",
    "fallback_no_covering_driver",
]

export function isFallbackOutcome(outcome: string | null | undefined): boolean {
    return outcome != null && (FALLBACK_OUTCOMES as readonly string[]).includes(outcome)
}

export type CoverageBadgeVariant = "default" | "secondary" | "outline"

export interface CoverageOutcomePresentation {
    label: string
    /** One sentence, safe to show directly under the label. */
    description: string
    badgeVariant: CoverageBadgeVariant
}

/**
 * `null` means automatic assignment did not write this row (a replan, a manual
 * change, or an older package). Show "Not recorded", not "Covered".
 *
 * Fallbacks are normal behaviour, not errors, so they are not shown in red.
 */
export function describeCoverageOutcome(outcome: string | null | undefined): CoverageOutcomePresentation {
    switch (outcome) {
        case "covered":
            return {
                label: "Covered",
                description: "Assigned to a driver whose service area includes this address.",
                badgeVariant: "default",
            }
        case "floater":
            return {
                label: "Floater match",
                description: "Assigned to a driver with no service areas. These drivers can get work anywhere.",
                badgeVariant: "secondary",
            }
        case "fallback_no_covering_capacity":
            return {
                label: "Fallback: no capacity",
                description: "Drivers cover this address, but none had space or a free vehicle. It went to another available driver.",
                badgeVariant: "outline",
            }
        case "fallback_no_covering_driver":
            return {
                label: "Fallback: no coverage",
                description: "No driver covers this address, so it went to another available driver. To change this, add a service area here and add drivers to it.",
                badgeVariant: "outline",
            }
        case "disabled":
            return {
                label: "Coverage off",
                description: "Service area matching was off when this package was assigned. Any driver could get it.",
                badgeVariant: "secondary",
            }
        default:
            return {
                label: "Not recorded",
                description: "A replan or a manual change placed this package, or it is older than coverage tracking.",
                badgeVariant: "outline",
            }
    }
}
