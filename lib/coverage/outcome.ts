/**
 * Display mapping for `package_assignment.coverage_outcome`.
 *
 * Not a generated API shape: this is a plain Postgres column (see
 * AddAssignmentCoverageOutcome1788829200000 in hikyaku-api), read directly
 * through Supabase rather than through a documented endpoint, so there is no
 * OpenAPI DTO to alias. Kept in one place because three surfaces show it
 * (package detail, the packages list, shift detail) and they must describe the
 * same value the same way.
 *
 * The five values mirror hikyaku-api's COVERAGE_OUTCOMES in
 * src/dispatch/coverage.ts exactly; that file is the source of truth for what
 * the assignment engine can write here.
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
 * `null` is not an error state: it means automatic assignment did not write
 * this row (a replan, a dispatcher's manual edit, or a package placed before
 * this column existed). Rendering it as "Not recorded" rather than as
 * "Covered" is a named acceptance criterion of HIK-19 — the alternative would
 * quietly claim coverage explains placements it had nothing to do with.
 *
 * Fallback outcomes deliberately do not use a destructive/red treatment.
 * Parent R13: a fallback is the designed behaviour for a partially-drawn map,
 * not a failure, and styling it as an alert trains dispatchers to ignore it.
 */
export function describeCoverageOutcome(outcome: string | null | undefined): CoverageOutcomePresentation {
    switch (outcome) {
        case "covered":
            return {
                label: "Covered",
                description: "Assigned to a driver whose territory covers this address.",
                badgeVariant: "default",
            }
        case "floater":
            return {
                label: "Floater match",
                description: "Assigned to a driver with no territories of their own, who is offered work anywhere.",
                badgeVariant: "secondary",
            }
        case "fallback_no_covering_capacity":
            return {
                label: "Fallback: no capacity",
                description: "A driver covers this address, but none had room or an idle van, so it went to any available driver instead.",
                badgeVariant: "outline",
            }
        case "fallback_no_covering_driver":
            return {
                label: "Fallback: no coverage",
                description: "No driver covers this address, so it went to any available driver instead. Draw or staff a territory here to change that.",
                badgeVariant: "outline",
            }
        case "disabled":
            return {
                label: "Coverage off",
                description: "Territory matching was switched off when this package was assigned, so every driver was treated as covering everywhere.",
                badgeVariant: "secondary",
            }
        default:
            return {
                label: "Not recorded",
                description: "This package predates coverage tracking, or was placed by a replan or a manual edit rather than automatic assignment.",
                badgeVariant: "outline",
            }
    }
}
