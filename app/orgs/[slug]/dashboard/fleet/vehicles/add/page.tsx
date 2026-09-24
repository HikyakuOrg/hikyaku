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
 * Undo a vehicle whose skills or images failed to save, so the add form stays
 * all or nothing. Returns false when the row could not be removed (the user
 * can add vehicles but not delete them), leaving it for the next attempt.
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
    // A vehicle an earlier attempt inserted but could not roll back. Saving
    // again finishes that row instead of inserting a second one, which would
    // also trip the unique plate.
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

            // 3. Upload images if any. Settle every upload before failing so
            // the rollback knows each path that did land.
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
            toast.success('Vehicle added successfully')
            router.push(`/orgs/${slug}/dashboard/fleet/vehicles`)
        } catch (error) {
            const reason = getErrorMessage(error)
            if (failedStep === 'vehicle') {
                toast.error(reason || 'Failed to add vehicle')
                return
            }

            const rolledBack = await rollBackVehicle(vehicleId!, uploadedPaths)
            strandedVehicleId.current = rolledBack ? null : vehicleId
            if (rolledBack) {
                toast.error(`Couldn't save the vehicle's ${failedStep}, so it was not added.`, {
                    description: reason
                })
            } else {
                toast.error(`Couldn't save the vehicle's ${failedStep}. Saving again will finish it rather than add another.`, {
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
