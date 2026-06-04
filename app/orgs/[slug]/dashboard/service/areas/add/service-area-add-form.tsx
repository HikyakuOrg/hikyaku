"use client"

import { polygonFeatureToEwkt } from "@/lib/maps/service-area-geometry"
import { createServiceArea, getOrganisationIdBySlug } from "@/lib/supabase/db"
import { useOrgSlug } from "@/lib/use-org"

import { ServiceAreaForm, type ServiceAreaFormValues } from "../service-area-form"

export function ServiceAreaAddForm() {
    const slug = useOrgSlug()

    const handleSubmit = async ({ name, polygon }: ServiceAreaFormValues) => {
        const organisationId = await getOrganisationIdBySlug(slug)
        await createServiceArea(name, polygonFeatureToEwkt(polygon), organisationId)
    }

    return (
        <ServiceAreaForm
            onSubmit={handleSubmit}
            submitLabel="Create Service Area"
            submittingLabel="Creating Service Area..."
            successMessage="Service area created."
        />
    )
}