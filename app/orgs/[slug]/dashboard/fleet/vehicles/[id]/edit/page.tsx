'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getVehicle, updateVehicle } from '@/lib/supabase/db'
import { toast } from 'sonner'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { VehicleForm, VehicleFormValues } from '../../components/vehicle-form'
import { Tables } from '@/lib/supabase/supabase'

export default function EditVehiclePage() {
    const router = useRouter()
    const { id, slug } = useParams() as { id: string; slug: string }
    const [vehicle, setVehicle] = useState<Tables<'vehicles'> | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (id) {
            getVehicle(id)
                .then(setVehicle)
                .catch((err) => {
                    toast.error('Failed to load vehicle data')
                    router.push(`/orgs/${slug}/dashboard/fleet/vehicles`)
                })
                .finally(() => setIsLoading(false))
        }
    }, [id, router])

    const handleSubmit = async (values: VehicleFormValues, newFiles: File[]) => {
        setIsSubmitting(true)
        try {
            // 1. Update vehicle record
            await updateVehicle(id, values as any)

            // 2. Upload new images if any
            if (newFiles.length > 0) {
                const supabase = createClient()
                const promises = newFiles.map(async (file) => {
                    const path = `${id}/${file.name}`
                    const { error } = await supabase.storage
                        .from('vehicles')
                        .upload(path, file, { upsert: true })
                    
                    if (error) {
                        console.error(`Error uploading ${file.name}:`, error)
                        throw error
                    }
                })
                await Promise.all(promises)
            }

            toast.success('Vehicle updated successfully')
            router.push(`/orgs/${slug}/dashboard/fleet/vehicles`)
        } catch (error: any) {
            toast.error(error.message || 'Failed to update vehicle')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        )
    }

    if (!vehicle) return null

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center gap-4 mb-2">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Edit Vehicle</h1>
                    <p className="text-muted-foreground">Update the information for vehicle {vehicle.vehicle_plate}.</p>
                </div>
            </div>

            <VehicleForm 
                initialData={vehicle}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                title="Edit Vehicle"
                description={`Updating information for ${vehicle.vehicle_plate}`}
                submitLabel="Update Vehicle"
            />
        </div>
    )
}
