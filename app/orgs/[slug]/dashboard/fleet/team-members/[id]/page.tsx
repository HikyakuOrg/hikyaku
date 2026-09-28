import { DRIVERS_UPDATE, SERVICE_AREAS_EDIT } from "@/lib/permissions"
import { hasOrgPermission } from "@/lib/supabase/server"

import { DriverDetailClient } from "./driver-detail-client"

export default async function DriverDetailsPage({
    params,
}: {
    params: Promise<{ slug: string; id: string }>
}) {
    const { slug, id } = await params
    // Check permissions on the server and pass them down.
    const [canEdit, canEditDrivingLimits] = await Promise.all([
        hasOrgPermission(slug, SERVICE_AREAS_EDIT),
        hasOrgPermission(slug, DRIVERS_UPDATE),
    ])

    return (
        <DriverDetailClient
            driverId={id}
            slug={slug}
            canEdit={canEdit}
            canEditDrivingLimits={canEditDrivingLimits}
        />
    )
}
