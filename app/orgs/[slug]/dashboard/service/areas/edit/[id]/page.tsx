import { SERVICE_AREAS_EDIT } from "@/lib/permissions"
import { hasOrgPermission } from "@/lib/supabase/server"

import { EditServiceAreaForm } from "./edit-service-area-form"

// Server shell so the permission is resolved once per request and handed to the
// client form as a prop. Loading the area itself stays client-side and ungated:
// any org member may look at the coverage, only saving is gated.
export default async function EditServiceAreaPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const canEdit = await hasOrgPermission(slug, SERVICE_AREAS_EDIT)

    return <EditServiceAreaForm canEdit={canEdit} />
}
