'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createVehicle } from '@/lib/supabase/db'
import { TablesInsert } from '@/lib/supabase/supabase'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/utils'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { VehicleForm, VehicleFormValues } from '../components/vehicle-form'

export default function AddVehiclePage() {
    const router = useRouter()
    const { slug } = useParams() as { slug: string }
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (values: VehicleFormValues, newFiles: File[]) => {
        setIsSubmitting(true)
        try {
            // 1. Create vehicle record
            const vehicle = await createVehicle({
                ...values,
                is_deleted: false
            } as TablesInsert<'vehicles'>)

            // 2. Upload images if any
            if (newFiles.length > 0) {
                const supabase = createClient()
                const promises = newFiles.map(async (file) => {
                    const path = `${vehicle.id}/${file.name}`
                    const { error } = await supabase.storage
                        .from('vehicles')
                        .upload(path, file)
                    
                    if (error) {
                        console.error(`Error uploading ${file.name}:`, error)
                        throw error
                    }
                })
                await Promise.all(promises)
            }

            toast.success('Vehicle added successfully')
            router.push(`/orgs/${slug}/dashboard/fleet/vehicles`)
        } catch (error) {
            toast.error(getErrorMessage(error) || 'Failed to add vehicle')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Add New Vehicle</h1>
                    <p className="text-muted-foreground">Expand your fleet by adding a new vehicle record.</p>
                </div>
            </div>

            <VehicleForm 
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                title="Add New Vehicle"
                description="Expand your fleet by adding a new vehicle record."
                submitLabel="Save Vehicle"
            />
        </div>
    )
}
