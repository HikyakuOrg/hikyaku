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
                    The organisation default is the driving limit profile every driver without a profile of their
                    own is planned within.
                </p>
            </div>

            {profilesResult.status !== "ok" || settingsResult.status !== "ok" ? (
                <div
                    className="rounded-xl border border-destructive/40 bg-destructive/5 px-6 py-8 text-center"
                    data-testid="driving-limits-settings-read-error"
                >
                    <h3 className="text-lg font-semibold">Driving limit settings could not be loaded</h3>
                    <p className="text-sm text-muted-foreground">Reload the page, and contact support if it keeps happening.</p>
                </div>
            ) : (
                <OrganisationDrivingLimitDefaultForm
                    slug={slug}
                    organisationId={settingsResult.organisationId}
                    profiles={profilesResult.profiles}
                    // A default pointing at a retired profile resolves to no default.
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
