import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DRIVERS_UPDATE } from "@/lib/permissions"
import {
    countDriversByDrivingLimitProfile,
    getDrivingLimitProfileDetail,
    getOrganisationDrivingLimitSettings,
} from "@/lib/supabase/db-server"
import { hasOrgPermission } from "@/lib/supabase/server"

import { DrivingLimitProfileForm } from "../driving-limit-profile-form"

export default async function DrivingLimitProfilePage({
    params,
}: {
    params: Promise<{ slug: string; id: string }>
}) {
    const { slug, id } = await params
    const [settingsResult, driverCounts, canEdit] = await Promise.all([
        getOrganisationDrivingLimitSettings(slug),
        countDriversByDrivingLimitProfile(),
        hasOrgPermission(slug, DRIVERS_UPDATE),
    ])
    const detailResult = settingsResult.status === "ok"
        ? await getDrivingLimitProfileDetail(settingsResult.organisationId, id)
        : settingsResult

    const listHref = `/orgs/${slug}/dashboard/fleet/driving-limits`
    const backButton = (
        <Button variant="ghost" size="sm" render={<Link href={listHref} />}>
            <ChevronLeft className="size-4" />
            All driving limit profiles
        </Button>
    )

    if (detailResult.status !== "ok") {
        const isMissing = detailResult.status === "not-found"

        return (
            <div className="space-y-6 p-6">
                {backButton}
                <div
                    className="flex h-48 w-full items-center justify-center rounded-xl border border-destructive/40 bg-destructive/5 px-6 text-center"
                    data-testid={isMissing ? "driving-limit-profile-not-found" : "driving-limit-profile-read-error"}
                >
                    <div className="space-y-2">
                        <h1 className="text-lg font-semibold">
                            {isMissing ? "Profile not found" : "Profile could not be loaded"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isMissing
                                ? "It may have been deleted, or it may belong to another organisation."
                                : "This is a problem reading it, not a deleted profile. Reload the page, and contact support if it keeps happening."}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const { profile } = detailResult
    const driverCount = driverCounts[profile.id] ?? 0
    const isDefault = settingsResult.status === "ok" && settingsResult.defaultProfileId === profile.id

    return (
        <div className="space-y-6 p-6">
            {backButton}

            <div>
                <div className="mb-2 flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight" data-testid="driving-limit-profile-title">
                        {profile.name}
                    </h1>
                    {isDefault && <Badge variant="secondary">Organisation default</Badge>}
                </div>
                <p className="text-muted-foreground">
                    {driverCount === 0
                        ? "No drivers use this profile of their own."
                        : `${driverCount} ${driverCount === 1 ? "driver uses" : "drivers use"} this profile.`}
                    {isDefault && " Every driver without a profile of their own follows it too."}
                </p>
            </div>

            <div className="max-w-4xl">
                <DrivingLimitProfileForm profile={profile} canEdit={canEdit} />
            </div>
        </div>
    )
}
