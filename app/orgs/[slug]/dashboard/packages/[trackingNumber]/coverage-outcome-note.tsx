"use client"

import { useEffect, useState } from "react"
import { Info } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { describeCoverageOutcome, isFallbackOutcome } from "@/lib/coverage/outcome"
import { getCoverageForPackage } from "@/lib/actions/coverage"
import { getSkillsByIds, type Skill } from "@/lib/supabase/db"
import type { CoverageSkillsDto } from "@/lib/api"

/**
 * Why this package landed on the driver it did. Sits next to the tracking
 * timeline rather than inside it: the timeline is a fixed PENDING → DELIVERED
 * sequence and a coverage decision is not a status, it is a fact recorded once
 * at assignment time (see AddAssignmentCoverageOutcome1788829200000).
 *
 * Deliberately not styled as an alert even for a fallback: parent R13 says a
 * fallback is the designed behaviour for a partially-drawn map, not an error,
 * and a red callout here would train dispatchers to ignore it.
 *
 * `packageId`, when given, additionally checks the on-demand skills
 * diagnostic (`/dispatch/coverage?packageId=`, HIK-94) — the only place a
 * skills mismatch is reported, since `coverage_outcome` itself has no
 * skills-specific value. A mismatch there replaces the generic note rather
 * than sitting alongside it, so a dispatcher sees the specific reason first.
 */
export function CoverageOutcomeNote({
    outcome,
    packageId,
}: {
    outcome: string | null | undefined
    packageId?: string | null
}) {
    const [skills, setSkills] = useState<CoverageSkillsDto | null>(null)
    const [missingSkills, setMissingSkills] = useState<Skill[]>([])

    useEffect(() => {
        if (!packageId) return
        getCoverageForPackage(packageId).then((result) => {
            if (result.status !== "ok" || !result.diagnostic.skills) return
            setSkills(result.diagnostic.skills)
            if (result.diagnostic.skills.missingSkillIds.length > 0) {
                getSkillsByIds(result.diagnostic.skills.missingSkillIds)
                    .then(setMissingSkills)
                    .catch((error) => console.error("Failed to resolve missing skill names:", error))
            }
        }).catch((error) => {
            console.error("Failed to load the coverage diagnostic:", error)
        })
    }, [packageId])

    const hasSkillsMismatch = skills !== null && !skills.satisfied

    if (!hasSkillsMismatch && outcome === undefined) return null

    if (hasSkillsMismatch) {
        return (
            <div
                className="mt-6 flex items-start gap-3 rounded-lg border bg-muted/30 p-4"
                data-testid="package-coverage-outcome"
            >
                <Info className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold">Coverage</h4>
                        <Badge variant="outline">Unassigned: skill mismatch</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {missingSkills.length > 0
                            ? `No vehicle in this warehouse holds ${missingSkills.map((s) => `"${s.name}"`).join(", ")}, which this package requires.`
                            : "No single vehicle in this warehouse holds every skill this package requires."}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Assign the skill to a vehicle at this warehouse, or add another vehicle that
                        already holds it, then re-run assignment.
                    </p>
                </div>
            </div>
        )
    }

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
