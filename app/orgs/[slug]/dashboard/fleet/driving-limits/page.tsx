import Link from "next/link"

import { DRIVERS_UPDATE } from "@/lib/permissions"
import {
    countDriversByDrivingLimitProfile,
    getOrganisationDrivingLimitSettings,
    listDrivingLimitProfiles,
} from "@/lib/supabase/db-server"
import { hasOrgPermission } from "@/lib/supabase/server"

import { AddDrivingLimitProfileButton } from "./add-driving-limit-profile-button"
import { DrivingLimitProfilesTable } from "./driving-limit-profiles-table"

/**
 * Driving limit profiles live under Fleet rather than Service: a profile is
 * fleet policy about the people and vehicles doing the work, the way vehicles
 * and team members are, not a property of the territory being served.
 */
export default async function DrivingLimitsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    // Reading profiles stays open to every org member; only the writes are gated.
    const [settingsResult, driverCounts, canEdit] = await Promise.all([
        getOrganisationDrivingLimitSettings(slug),
        countDriversByDrivingLimitProfile(),
        hasOrgPermission(slug, DRIVERS_UPDATE),
    ])
    const profilesResult = settingsResult.status === "ok"
        ? await listDrivingLimitProfiles(settingsResult.organisationId)
        : settingsResult

    const profiles = profilesResult.status === "ok" ? profilesResult.profiles : []
    const storedDefaultId = settingsResult.status === "ok" ? settingsResult.defaultProfileId : null
    // A default pointing at a retired profile resolves to no default, so it is shown as none.
    const defaultProfile = profiles.find((profile) => profile.id === storedDefaultId) ?? null

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="mb-2 text-3xl font-bold tracking-tight">Driving Limits</h1>
                    <p className="max-w-3xl text-muted-foreground">
                        Named limits on how long, how far and how many stops a shift may run. Point a driver at a
                        profile from their page, or set an organisation default for every driver without one.
                    </p>
                </div>

                <AddDrivingLimitProfileButton slug={slug} canEdit={canEdit} />
            </div>

            <div
                className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground"
                data-testid="driving-limits-default-summary"
            >
                <p>
                    Limits are opt-in. A driver with no profile, in an organisation with no default, is planned
                    exactly as before. Changing a limit does not replan shifts already planned; it applies the next
                    time each one is planned.
                </p>
                <p className="mt-2">
                    Organisation default:{" "}
                    <span className="font-medium text-foreground">{defaultProfile?.name ?? "None"}</span>
                    {" · "}
                    <Link
                        href={`/orgs/${slug}/dashboard/user/driving-limits`}
                        className="underline underline-offset-2 hover:text-foreground"
                    >
                        Change in settings
                    </Link>
                </p>
            </div>

            {profilesResult.status === "error" ? (
                <div
                    className="flex h-48 w-full items-center justify-center rounded-xl border border-destructive/40 bg-destructive/5 px-6 text-center"
                    data-testid="driving-limit-profiles-read-error"
                >
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">Driving limit profiles could not be loaded</h2>
                        <p className="text-sm text-muted-foreground">
                            This is a problem reading them, not an organisation without profiles. Reload the page,
                            and contact support if it keeps happening.
                        </p>
                    </div>
                </div>
            ) : profiles.length === 0 ? (
                <div
                    className="flex h-48 w-full items-center justify-center rounded-xl border bg-muted/20 px-6 text-center"
                    data-testid="driving-limit-profiles-empty"
                >
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">No driving limit profiles yet</h2>
                        <p className="text-sm text-muted-foreground">
                            Add one from a template or from scratch. Until then no driver has a limit.
                        </p>
                    </div>
                </div>
            ) : (
                <DrivingLimitProfilesTable
                    slug={slug}
                    profiles={profiles}
                    defaultProfileId={defaultProfile?.id ?? null}
                    driverCounts={driverCounts}
                    canEdit={canEdit}
                />
            )}
        </div>
    )
}
