'use client'

import { useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createVehicle, discardVehicle, getOrganisationIdBySlug, setVehicleSkills, updateVehicle } from '@/lib/supabase/db'
import { TablesInsert } from '@/lib/supabase/supabase'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { VehicleForm, VehicleFormValues } from '../components/vehicle-form'

/**
 * Remove a vehicle whose skills or photos did not save. Returns false when it
 * cannot be removed (no delete permission); the next save then updates it.
 */
async function rollBackVehicle(vehicleId: string, uploadedPaths: string[]) {
    try {
        if (uploadedPaths.length > 0) {
            await createClient().storage.from('vehicles').remove(uploadedPaths)
        }
        return await discardVehicle(vehicleId)
    } catch (error) {
        console.error('Error rolling back vehicle:', error)
        return false
    }
}

export default function AddVehiclePage() {
    const router = useRouter()
    const { slug } = useParams() as { slug: string }
    const [isSubmitting, setIsSubmitting] = useState(false)
    // A vehicle from an earlier try that could not be removed. Saving again
    // updates it, so there is no second vehicle with the same plate.
    const strandedVehicleId = useRef<string | null>(null)

    const handleSubmit = async (values: VehicleFormValues, newFiles: File[]) => {
        setIsSubmitting(true)
        let vehicleId = strandedVehicleId.current
        let failedStep = 'vehicle'
        const uploadedPaths: string[] = []
        try {
            const { skillIds, ...vehicleFields } = values

            // 1. Create the vehicle record, or pick up the one left behind
            if (vehicleId) {
                await updateVehicle(vehicleId, vehicleFields)
            } else {
                const organisationId = await getOrganisationIdBySlug(slug)
                const vehicle = await createVehicle({
                    ...vehicleFields,
                    organisation_id: organisationId,
                    is_deleted: false
                } as TablesInsert<'vehicles'>)
                vehicleId = vehicle.id
            }

            // 2. Save its skill assignments
            failedStep = 'skills'
            await setVehicleSkills(vehicleId, skillIds)

            // 3. Upload photos. Wait for all uploads, so the rollback knows
            // which files to remove.
            failedStep = 'images'
            if (newFiles.length > 0) {
                const supabase = createClient()
                const results = await Promise.allSettled(newFiles.map(async (file) => {
                    const path = `${vehicleId}/${file.name}`
                    const { error } = await supabase.storage
                        .from('vehicles')
                        .upload(path, file)

                    if (error) {
                        console.error(`Error uploading ${file.name}:`, error)
                        throw error
                    }
                    uploadedPaths.push(path)
                }))
                const failed = results.find((result) => result.status === 'rejected')
                if (failed) throw failed.reason
            }

            strandedVehicleId.current = null
            toast.success('Vehicle added.')
            router.push(`/orgs/${slug}/dashboard/fleet/vehicles`)
        } catch (error) {
            const reason = getErrorMessage(error)
            if (failedStep === 'vehicle') {
                toast.error(reason || 'Could not add the vehicle.')
                return
            }

            const rolledBack = await rollBackVehicle(vehicleId!, uploadedPaths)
            strandedVehicleId.current = rolledBack ? null : vehicleId
            if (rolledBack) {
                toast.error(`Could not save the vehicle's ${failedStep}. The vehicle was not added.`, {
                    description: reason
                })
            } else {
                toast.error(`Could not save the vehicle's ${failedStep}. Save again to finish adding this vehicle.`, {
                    description: reason
                })
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Add New Vehicle</h1>
                    <p className="text-muted-foreground">Enter the details of the new vehicle.</p>
                </div>
            </div>

            <VehicleForm
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                title="Add New Vehicle"
                description="Enter the details of the new vehicle."
                submitLabel="Save Vehicle"
            />
        </div>
    )
}
