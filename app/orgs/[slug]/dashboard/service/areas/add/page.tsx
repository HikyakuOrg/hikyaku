import { SERVICE_AREAS_EDIT } from "@/lib/permissions"
import { hasOrgPermission } from "@/lib/supabase/server"

import { ServiceAreaAddForm } from "./service-area-add-form"

export default async function AddServiceAreaPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    // Resolved once here so the form (and every control inside it) can be gated
    // without a client round trip. The list page hides the entry point, but this
    // route is still reachable by typing the URL.
    const canEdit = await hasOrgPermission(slug, SERVICE_AREAS_EDIT)

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Add Service Area</h1>
                <p className="text-muted-foreground">
                    Name a service area and define its coverage on the map.
                </p>
            </div>

            <ServiceAreaAddForm canEdit={canEdit} />
        </div>
    )
}
