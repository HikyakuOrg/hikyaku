import { getServiceAreaExtent } from "@/lib/supabase/db-server"
import { hasOrgPermission } from "@/lib/supabase/server"
import { SERVICE_AREAS_EDIT } from "@/lib/permissions"

import { AddServiceAreaButton } from "./add-service-area-button"
import { ServiceAreasMap } from "./service-areas-map"

export default async function ServiceAreasPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    // Viewing the map stays open to every org member; only the write entry point
    // is gated. Resolved once here and handed down as a prop so the button does
    // not have to ask for itself.
    const [initialBounds, canEdit] = await Promise.all([
        getServiceAreaExtent(),
        hasOrgPermission(slug, SERVICE_AREAS_EDIT),
    ])

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="mb-2 text-3xl font-bold tracking-tight">Service Areas</h1>
                    <p className="text-muted-foreground">
                        View your delivery coverage areas on the map.
                    </p>
                </div>

                <AddServiceAreaButton slug={slug} canEdit={canEdit} />
            </div>

            <ServiceAreasMap initialBounds={initialBounds ? [
                [initialBounds.minLng, initialBounds.minLat],
                [initialBounds.maxLng, initialBounds.maxLat],
            ] : null} />
        </div>
    )
}
