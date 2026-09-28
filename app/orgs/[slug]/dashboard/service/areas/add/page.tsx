import { SERVICE_AREAS_EDIT } from "@/lib/permissions"
import { hasOrgPermission } from "@/lib/supabase/server"

import { ServiceAreaAddForm } from "./service-area-add-form"

export default async function AddServiceAreaPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    // Check here too: users can open this URL directly.
    const canEdit = await hasOrgPermission(slug, SERVICE_AREAS_EDIT)

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Add Service Area</h1>
                <p className="text-muted-foreground">
                    Name the area and draw it on the map.
                </p>
            </div>

            <ServiceAreaAddForm canEdit={canEdit} />
        </div>
    )
}
