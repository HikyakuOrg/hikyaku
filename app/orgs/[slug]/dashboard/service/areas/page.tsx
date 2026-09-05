import { getServiceAreaExtent, getServiceAreas } from "@/lib/supabase/db-server"
import { hasOrgPermission } from "@/lib/supabase/server"
import { SERVICE_AREAS_EDIT } from "@/lib/permissions"

import { AddServiceAreaButton } from "./add-service-area-button"
import { ServiceAreasExplorer } from "./service-areas-explorer"

export default async function ServiceAreasPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    // Viewing the map and the list stays open to every org member; only the
    // write entry points are gated. Resolved once here and handed down as a prop
    // so no control has to ask for itself.
    const [extentResult, areasResult, canEdit] = await Promise.all([
        getServiceAreaExtent(),
        getServiceAreas(),
        hasOrgPermission(slug, SERVICE_AREAS_EDIT),
    ])

    // A failed read and an organisation that has drawn nothing are different
    // things and get different panels. Showing the onboarding copy for a broken
    // backend told the dispatcher their areas were gone.
    const hasFailedRead = extentResult.status === "error" || areasResult.status === "error"
    const areas = areasResult.status === "ok" ? areasResult.areas : []
    const extent = extentResult.status === "ok" ? extentResult.extent : null

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="mb-2 text-3xl font-bold tracking-tight">Service Areas</h1>
                    <p className="text-muted-foreground">
                        View your delivery coverage areas on the map, and every area you have drawn in the list below.
                    </p>
                </div>

                <AddServiceAreaButton slug={slug} canEdit={canEdit} />
            </div>

            {hasFailedRead ? (
                <div
                    className="flex h-[320px] w-full items-center justify-center rounded-xl border border-destructive/40 bg-destructive/5 px-6 text-center"
                    data-testid="service-areas-read-error"
                >
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">Service areas could not be loaded</h2>
                        <p className="text-sm text-muted-foreground">
                            This is a problem reading them, not an empty organisation. Reload the page, and
                            contact support if it keeps happening.
                        </p>
                    </div>
                </div>
            ) : areas.length === 0 ? (
                <div
                    className="flex h-[320px] w-full items-center justify-center rounded-xl border bg-muted/20 px-6 text-center"
                    data-testid="service-areas-empty"
                >
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">No service areas yet</h2>
                        <p className="text-sm text-muted-foreground">
                            Add a service area to start visualizing coverage on the map.
                        </p>
                    </div>
                </div>
            ) : (
                <ServiceAreasExplorer
                    slug={slug}
                    initialAreas={areas}
                    initialBounds={extent ? [
                        [extent.minLng, extent.minLat],
                        [extent.maxLng, extent.maxLat],
                    ] : null}
                    canEdit={canEdit}
                />
            )}
        </div>
    )
}
