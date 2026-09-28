import { SERVICE_AREAS_EDIT } from "@/lib/permissions"
import { hasOrgPermission } from "@/lib/supabase/server"

import { EditServiceAreaForm } from "./edit-service-area-form"

// Checks the permission on the server. All members can view; only saving needs it.
export default async function EditServiceAreaPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const canEdit = await hasOrgPermission(slug, SERVICE_AREAS_EDIT)

    return <EditServiceAreaForm canEdit={canEdit} />
}
