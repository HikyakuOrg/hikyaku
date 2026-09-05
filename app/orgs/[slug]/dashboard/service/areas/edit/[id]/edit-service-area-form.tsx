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

                // Refuse to open a multi-part area rather than show one of its
                // parts. This form saves back the single polygon it is holding,
                // so opening a two-part territory and pressing save would
                // replace both parts with whichever one had been drawn on
                // screen. Nothing this app writes is multi-part today, but a
                // direct SQL insert or a later multi-part drawing feature would
                // be, and this is the path that would quietly lose it.
                if (editable.status === "multiple-parts") {
                    throw new Error(
                        `"${data.name}" is made up of ${editable.partCount} separate parts, which this editor cannot open yet. Contact support, or recreate each part as its own service area.`
                    )
                }

                if (editable.status === "unsupported") {
                    throw new Error("This service area does not contain editable polygon geometry.")
                }

                if (isMounted) {
                    setServiceArea({
                        id: data.id,
                        name: data.name,
                        polygon: editable.feature,
                    })
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to load the service area."
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
            throw new Error("Service area data is not loaded yet.")
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
                            ? `Update the service area name and coverage polygon for ${serviceArea.name}.`
                            : `View the coverage polygon for ${serviceArea.name}.`}
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
