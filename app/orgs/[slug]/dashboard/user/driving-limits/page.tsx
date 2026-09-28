import { ORGANISATION_EDIT } from "@/lib/permissions"
import { getOrganisationDrivingLimitSettings, listDrivingLimitProfiles } from "@/lib/supabase/db-server"
import { hasOrgPermission } from "@/lib/supabase/server"

import { OrganisationDrivingLimitDefaultForm } from "./organisation-driving-limit-default-form"

export default async function DrivingLimitsSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const [settingsResult, canEdit] = await Promise.all([
        getOrganisationDrivingLimitSettings(slug),
        hasOrgPermission(slug, ORGANISATION_EDIT),
    ])
    const profilesResult = settingsResult.status === "ok"
        ? await listDrivingLimitProfiles(settingsResult.organisationId)
        : settingsResult

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold tracking-tight">Driving Limits</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    The driving limit profile for drivers without a profile of their own.
                </p>
            </div>

            {profilesResult.status !== "ok" || settingsResult.status !== "ok" ? (
                <div
                    className="rounded-xl border border-destructive/40 bg-destructive/5 px-6 py-8 text-center"
                    data-testid="driving-limits-settings-read-error"
                >
                    <h3 className="text-lg font-semibold">Could not load the driving limit settings</h3>
                    <p className="text-sm text-muted-foreground">Reload the page. If the problem continues, contact support.</p>
                </div>
            ) : (
                <OrganisationDrivingLimitDefaultForm
                    slug={slug}
                    organisationId={settingsResult.organisationId}
                    profiles={profilesResult.profiles}
                    // A default that points at a deleted profile counts as none.
                    defaultProfileId={
                        profilesResult.profiles.some((profile) => profile.id === settingsResult.defaultProfileId)
                            ? settingsResult.defaultProfileId
                            : null
                    }
                    canEdit={canEdit}
                />
            )}
        </div>
    )
}
