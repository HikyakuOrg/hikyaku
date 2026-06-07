'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { getErrorMessage } from '@/lib/utils'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { createClient } from '@/lib/supabase/client'
import { useOrgSlug } from '@/lib/use-org'
import { getVehicles, getOrganisationIdBySlug, createMaintenanceRecord } from '@/lib/supabase/db'

const maintenanceSchema = z.object({
    vehicle_id: z.string().min(1, 'Please select a vehicle'),
    odometer: z.number().min(0, 'Odometer must be 0 or more'),
    description: z.string().min(1, 'Description is required'),
    date_serviced: z.string().min(1, 'Date serviced is required'),
})

type MaintenanceFormValues = z.infer<typeof maintenanceSchema>

type VehicleOption = {
    id: string
    vehicle_plate: string | null
    vehicle_make: string | null
    vehicle_model: string | null
    vehicle_year: number | null
}

function vehicleLabel(v: VehicleOption) {
    const makeModel = [v.vehicle_make, v.vehicle_model].filter(Boolean).join(' ')
    return [v.vehicle_plate, makeModel].filter(Boolean).join(' — ') || 'Unnamed vehicle'
}

export default function AddMaintenancePage() {
    const router = useRouter()
    const slug = useOrgSlug()
    const searchParams = useSearchParams()
    const preselectedVehicleId = searchParams.get('vehicleId') ?? ''
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [vehicles, setVehicles] = useState<VehicleOption[]>([])
    const [isLoadingVehicles, setIsLoadingVehicles] = useState(true)
    const [serviceDate, setServiceDate] = useState<Date | undefined>(undefined)

    const form = useForm<MaintenanceFormValues>({
        resolver: zodResolver(maintenanceSchema),
        defaultValues: {
            vehicle_id: preselectedVehicleId,
            odometer: undefined as unknown as number,
            description: '',
            date_serviced: '',
        },
    })

    const { errors } = form.formState

    const upload = useSupabaseUpload({
        bucketName: 'maintenance',
        maxFiles: 1,
        maxFileSize: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/*'],
    })

    useEffect(() => {
        getVehicles()
            .then((data) => setVehicles(data as VehicleOption[]))
            .finally(() => setIsLoadingVehicles(false))
    }, [])

    function handleDateSelect(date: Date | undefined) {
        setServiceDate(date)
        form.setValue('date_serviced', date ? format(date, 'yyyy-MM-dd') : '', {
            shouldValidate: true,
        })
    }

    async function handleSubmit(values: MaintenanceFormValues) {
        setIsSubmitting(true)
        try {
            const supabase = createClient()
            const [organisationId, { data: { user } }] = await Promise.all([
                getOrganisationIdBySlug(slug),
                supabase.auth.getUser(),
            ])
            const record = await createMaintenanceRecord({
                organisation_id: organisationId,
                vehicle_id: values.vehicle_id,
                user_id: user?.id ?? null,
                odometer: values.odometer,
                description: values.description,
                date_serviced: values.date_serviced,
            })

            if (upload.files.length > 0) {
                await Promise.all(
                    upload.files.map(async (file) => {
                        const { error } = await supabase.storage
                            .from('maintenance')
                            .upload(`${record.id}/${file.name}`, file)
                        if (error) throw error
                    })
                )
            }

            toast.success('Maintenance record added')
            form.reset()
            setServiceDate(undefined)
            upload.setFiles([])
        } catch (error) {
            toast.error(getErrorMessage(error) || 'Failed to add maintenance record')
        } finally {
            setIsSubmitting(false)
        }
    }

    const selectedVehicle = vehicles.find((v) => v.id === form.watch('vehicle_id'))

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Add Maintenance Record</h1>
                <p className="text-muted-foreground">
                    Log a completed service performed on a fleet vehicle.
                </p>
            </div>

            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                <Card className="border-none shadow-premium bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Service Details</CardTitle>
                        <CardDescription>Record what was serviced and when.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="vehicle">Vehicle serviced</Label>
                                {preselectedVehicleId && (isLoadingVehicles || selectedVehicle) ? (
                                    <div className="h-10 rounded-md border bg-muted/50 px-3 py-2 text-sm flex items-center">
                                        {isLoadingVehicles ? '—' : vehicleLabel(selectedVehicle!)}
                                    </div>
                                ) : (
                                    <Select
                                        onValueChange={(val) =>
                                            form.setValue('vehicle_id', val ?? '', { shouldValidate: true })
                                        }
                                        value={form.watch('vehicle_id')}
                                    >
                                        <SelectTrigger id="vehicle">
                                            <SelectValue placeholder="Select a vehicle">
                                                {selectedVehicle ? vehicleLabel(selectedVehicle) : undefined}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {vehicles.map((v) => (
                                                <SelectItem key={v.id} value={v.id}>
                                                    {vehicleLabel(v)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                {errors.vehicle_id && (
                                    <p className="text-xs text-destructive">{errors.vehicle_id.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="odometer">Odometer</Label>
                                <Input
                                    id="odometer"
                                    type="number"
                                    placeholder="e.g. 84210"
                                    {...form.register('odometer', { valueAsNumber: true })}
                                />
                                {errors.odometer && (
                                    <p className="text-xs text-destructive">{errors.odometer.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date-serviced">Date serviced</Label>
                                <Popover>
                                    <PopoverTrigger className="w-full">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={
                                                'w-full h-10 rounded-md border bg-transparent px-3 py-2 text-sm justify-start text-left font-normal' +
                                                (serviceDate ? '' : ' text-muted-foreground')
                                            }
                                        >
                                            <span>
                                                {serviceDate ? format(serviceDate, 'yyyy-MM-dd') : 'Select a date'}
                                            </span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={serviceDate}
                                            onSelect={handleDateSelect}
                                        />
                                    </PopoverContent>
                                </Popover>
                                {errors.date_serviced && (
                                    <p className="text-xs text-destructive">{errors.date_serviced.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description of servicing done</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe the maintenance performed"
                                {...form.register('description')}
                            />
                            {errors.description && (
                                <p className="text-xs text-destructive">{errors.description.message}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-premium bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Photo</CardTitle>
                        <CardDescription>Optionally attach a photo of the service.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Dropzone {...upload} className="min-h-[150px] flex items-center justify-center">
                            <DropzoneEmptyState />
                            <DropzoneContent />
                        </Dropzone>
                    </CardContent>
                </Card>

                <div className="flex items-center justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => router.push(`/orgs/${slug}/dashboard/fleet/vehicles`)}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Add Maintenance Record'
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}
