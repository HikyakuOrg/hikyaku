'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getVehicle, setVehicleSkills, updateVehicle } from '@/lib/supabase/db'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/utils'
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
                .catch(() => {
                    toast.error('Could not load the vehicle.')
                    router.push(`/orgs/${slug}/dashboard/fleet/vehicles`)
                })
                .finally(() => setIsLoading(false))
        }
    }, [id, router, slug])

    const handleSubmit = async (values: VehicleFormValues, newFiles: File[]) => {
        setIsSubmitting(true)
        try {
            const { skillIds, ...vehicleFields } = values

            // 1. Update vehicle record
            await updateVehicle(id, vehicleFields)

            // 2. Save the skills. If that fails, restore the old fields.
            try {
                await setVehicleSkills(id, skillIds)
            } catch (error) {
                if (vehicle) {
                    const previousFields = Object.fromEntries(
                        Object.keys(vehicleFields).map((key) => [key, vehicle[key as keyof typeof vehicleFields]])
                    ) as Partial<Tables<'vehicles'>>
                    await updateVehicle(id, previousFields).catch((restoreError) =>
                        console.error('Error restoring vehicle fields:', restoreError)
                    )
                }
                throw error
            }

            // 3. Upload new images if any
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

            toast.success('Vehicle updated.')
            router.push(`/orgs/${slug}/dashboard/fleet/vehicles`)
        } catch (error) {
            toast.error(getErrorMessage(error) || 'Could not update the vehicle.')
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
                    <p className="text-muted-foreground">Change the details of {vehicle.vehicle_plate}.</p>
                </div>
            </div>

            <VehicleForm 
                initialData={vehicle}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                title="Edit Vehicle"
                description={`Change the details of ${vehicle.vehicle_plate}.`}
                submitLabel="Update Vehicle"
            />
        </div>
    )
}
