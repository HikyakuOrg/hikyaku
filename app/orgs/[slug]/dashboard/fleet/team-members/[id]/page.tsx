import { SERVICE_AREAS_EDIT } from "@/lib/permissions"
import { hasOrgPermission } from "@/lib/supabase/server"

import { DriverDetailClient } from "./driver-detail-client"

export default async function DriverDetailsPage({
    params,
}: {
    params: Promise<{ slug: string; id: string }>
}) {
    const { slug, id } = await params
    // Resolved once here, the same way the service area pages do it, and
    // passed down as a prop rather than checked from the client card itself:
    // hasOrgPermission() is documented to cost a round trip and wants calling
    // from a server component.
    const canEdit = await hasOrgPermission(slug, SERVICE_AREAS_EDIT)

    return <DriverDetailClient driverId={id} slug={slug} canEdit={canEdit} />
}
