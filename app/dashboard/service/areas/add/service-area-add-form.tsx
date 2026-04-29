"use client"

import { polygonFeatureToEwkt } from "@/lib/maps/service-area-geometry"
import { createServiceArea } from "@/lib/supabase/db"

import { ServiceAreaForm, type ServiceAreaFormValues } from "../service-area-form"

export function ServiceAreaAddForm() {
    const handleSubmit = async ({ name, polygon }: ServiceAreaFormValues) => {
        await createServiceArea(name, polygonFeatureToEwkt(polygon))
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