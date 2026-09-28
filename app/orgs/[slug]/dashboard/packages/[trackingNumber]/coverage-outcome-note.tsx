"use client"

import { useEffect, useState } from "react"
import { Info } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { describeCoverageOutcome, isFallbackOutcome } from "@/lib/coverage/outcome"
import { getCoverageForPackage } from "@/lib/actions/coverage"
import { getSkillsByIds, type Skill } from "@/lib/supabase/db"
import type { CoverageSkillsDto } from "@/lib/api"

/**
 * Why the package went to its driver. Not shown as an alert: fallbacks are
 * normal. With `packageId` it also checks skills; a missing skill replaces the
 * normal note.
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
                        <Badge variant="outline">Not assigned: missing skill</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {missingSkills.length > 0
                            ? `No vehicle at this warehouse has ${missingSkills.map((s) => `"${s.name}"`).join(", ")}, which this package needs.`
                            : "No vehicle at this warehouse has all the skills this package needs."}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Give the skill to a vehicle at this warehouse, or add a vehicle that has it.
                        Then run assignment again.
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
                        This is normal, not an error.
                    </p>
                )}
            </div>
        </div>
    )
}
