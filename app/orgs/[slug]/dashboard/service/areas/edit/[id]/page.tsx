"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getEditableServiceAreaPolygonFeature, polygonFeatureToEwkt } from "@/lib/maps/service-area-geometry"
import { getServiceAreaById, updateServiceArea } from "@/lib/supabase/db"
import { toast } from "sonner"

import { ServiceAreaForm, type ServiceAreaFormValues } from "../../service-area-form"

type EditableServiceArea = {
    id: string
    name: string
    polygon: NonNullable<ReturnType<typeof getEditableServiceAreaPolygonFeature>>
}

export default function EditServiceAreaPage() {
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
                const polygon = getEditableServiceAreaPolygonFeature(data.geometry)

                if (!polygon) {
                    throw new Error("This service area does not contain editable polygon geometry.")
                }

                if (isMounted) {
                    setServiceArea({
                        id: data.id,
                        name: data.name,
                        polygon,
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
    }, [id, router])

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
                    <h1 className="mb-2 text-3xl font-bold tracking-tight">Edit Service Area</h1>
                    <p className="text-muted-foreground">
                        Update the service area name and coverage polygon for {serviceArea.name}.
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
            />
        </div>
    )
}