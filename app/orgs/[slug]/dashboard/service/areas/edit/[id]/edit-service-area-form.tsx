"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    getEditableServiceAreaPolygonFeature,
    polygonFeatureToEwkt,
    type EditableServiceAreaPolygon,
} from "@/lib/maps/service-area-geometry"
import { getServiceAreaById, updateServiceArea } from "@/lib/supabase/db"
import { toast } from "sonner"

import { ServiceAreaForm, type ServiceAreaFormValues } from "../../service-area-form"

type EditableServiceArea = {
    id: string
    name: string
    polygon: EditableServiceAreaPolygon
}

export function EditServiceAreaForm({ canEdit }: { canEdit: boolean }) {
    const router = useRouter()
    const { id, slug } = useParams<{ id: string; slug: string }>()
    const [serviceArea, setServiceArea] = useState<EditableServiceArea | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        const loadServiceArea = async () => {
            if (!id) {
                return
            }

            try {
                const data = await getServiceAreaById(id)
                const editable = getEditableServiceAreaPolygonFeature(data.geometry)

                // Do not open a multi-part area: a save would keep only one part.
                if (editable.status === "multiple-parts") {
                    throw new Error(
                        `"${data.name}" has ${editable.partCount} separate parts. This editor can only open an area with one part. Contact support, or create each part as its own service area.`
                    )
                }

                if (editable.status === "unsupported") {
                    throw new Error("This service area has no shape that can be edited.")
                }

                if (isMounted) {
                    setServiceArea({
                        id: data.id,
                        name: data.name,
                        polygon: editable.feature,
                    })
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : "Could not load the service area."
                toast.error(message)
                router.push(`/orgs/${slug}/dashboard/service/areas`)
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        void loadServiceArea()

        return () => {
            isMounted = false
        }
    }, [id, router, slug])

    const handleSubmit = async ({ name, polygon }: ServiceAreaFormValues) => {
        if (!serviceArea) {
            throw new Error("The service area is not loaded yet.")
        }

        await updateServiceArea(serviceArea.id, name, polygonFeatureToEwkt(polygon))
        router.push(`/orgs/${slug}/dashboard/service/areas`)
    }

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        )
    }

    if (!serviceArea) {
        return null
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-start gap-4">
                <Button type="button" variant="ghost" size="icon" onClick={() => router.back()}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>

                <div>
                    <h1 className="mb-2 text-3xl font-bold tracking-tight">
                        {canEdit ? "Edit Service Area" : "Service Area"}
                    </h1>
                    <p className="text-muted-foreground">
                        {canEdit
                            ? `Change the name or the shape of ${serviceArea.name}.`
                            : `The shape of ${serviceArea.name}.`}
                    </p>
                </div>
            </div>

            <ServiceAreaForm
                initialName={serviceArea.name}
                initialPolygon={serviceArea.polygon}
                onSubmit={handleSubmit}
                submitLabel="Update Service Area"
                submittingLabel="Updating Service Area..."
                successMessage="Service area updated."
                canEdit={canEdit}
            />
        </div>
    )
}
