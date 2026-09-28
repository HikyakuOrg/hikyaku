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

/** Under Fleet, not Service: a profile is a rule for drivers, not for an area. */
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
    // A default that points at a deleted profile shows as none.
    const defaultProfile = profiles.find((profile) => profile.id === storedDefaultId) ?? null

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="mb-2 text-3xl font-bold tracking-tight">Driving Limits</h1>
                    <p className="max-w-3xl text-muted-foreground">
                        Limits on shift time, distance and stops. Set a profile on a driver&apos;s page, or set an
                        organisation default for drivers without one.
                    </p>
                </div>

                <AddDrivingLimitProfileButton slug={slug} canEdit={canEdit} />
            </div>

            <div
                className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground"
                data-testid="driving-limits-default-summary"
            >
                <p>
                    Limits are optional. Drivers without a profile or a default have no limits. Changes apply the
                    next time a shift is planned.
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
                        <h2 className="text-lg font-semibold">Could not load driving limit profiles</h2>
                        <p className="text-sm text-muted-foreground">
                            Reload the page. If the problem continues, contact support.
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
                            Add one from a template or from the start. Until then, drivers have no limits.
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
