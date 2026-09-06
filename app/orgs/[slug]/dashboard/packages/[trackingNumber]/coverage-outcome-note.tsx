import { Info } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { describeCoverageOutcome, isFallbackOutcome } from "@/lib/coverage/outcome"

/**
 * Why this package landed on the driver it did. Sits next to the tracking
 * timeline rather than inside it: the timeline is a fixed PENDING → DELIVERED
 * sequence and a coverage decision is not a status, it is a fact recorded once
 * at assignment time (see AddAssignmentCoverageOutcome1788829200000).
 *
 * Deliberately not styled as an alert even for a fallback: parent R13 says a
 * fallback is the designed behaviour for a partially-drawn map, not an error,
 * and a red callout here would train dispatchers to ignore it.
 */
export function CoverageOutcomeNote({ outcome }: { outcome: string | null }) {
    const { label, description, badgeVariant } = describeCoverageOutcome(outcome)

    return (
        <div
            className="mt-6 flex items-start gap-3 rounded-lg border bg-muted/30 p-4"
            data-testid="package-coverage-outcome"
        >
            <Info className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">Coverage</h4>
                    <Badge variant={badgeVariant}>{label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{description}</p>
                {isFallbackOutcome(outcome) && (
                    <p className="text-sm text-muted-foreground">
                        This is not an error — it is what happens when the map does not fully explain
                        where a package should go yet.
                    </p>
                )}
            </div>
        </div>
    )
}
