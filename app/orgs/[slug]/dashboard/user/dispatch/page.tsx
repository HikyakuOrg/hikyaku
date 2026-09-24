import { ORGANISATION_EDIT } from "@/lib/permissions"
import { getOrganisationDispatchSettings } from "@/lib/supabase/db-server"
import { hasOrgPermission } from "@/lib/supabase/server"

import { DispatchSettingsForm } from "./dispatch-settings-form"

export default async function DispatchSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const [result, canEdit] = await Promise.all([
        getOrganisationDispatchSettings(slug),
        hasOrgPermission(slug, ORGANISATION_EDIT),
    ])

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold tracking-tight">Dispatch</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    How packages are assigned to drivers in this organisation.
                </p>
            </div>

            {result.status !== "ok" ? (
                <div
                    className="rounded-xl border border-destructive/40 bg-destructive/5 px-6 py-8 text-center"
                    data-testid="dispatch-settings-read-error"
                >
                    <h3 className="text-lg font-semibold">Dispatch settings could not be loaded</h3>
                    <p className="text-sm text-muted-foreground">Reload the page, and contact support if it keeps happening.</p>
                </div>
            ) : (
                <DispatchSettingsForm
                    slug={slug}
                    organisationId={result.organisationId}
                    settings={result.settings}
                    canEdit={canEdit}
                />
            )}
        </div>
    )
}
