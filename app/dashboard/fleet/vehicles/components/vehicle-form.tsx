'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getVehicleTypes, getWarehouses } from '@/lib/supabase/db'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, AlertCircle, X, Image as ImageIcon } from 'lucide-react'
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Tables } from '@/lib/supabase/supabase'
import { decodeVin } from '@/lib/actions/vin'

const vehicleSchema = z.object({
    vehicle_plate: z.string().min(1, 'Plate number is required'),
    vehicle_identification_number: z.string().length(17, 'VIN must be 17 characters'),
    vehicle_make: z.string().min(1, 'Make is required'),
    vehicle_model: z.string().min(1, 'Model is required'),
    vehicle_year: z.number().min(1900).max(new Date().getFullYear() + 1).optional(),
    vehicle_type: z.string().uuid('Please select a vehicle type'),
    vehicle_gross_limits: z.number().positive('Gross limits must be positive'),
    warehouse_id: z.string().uuid('Please select a warehouse'),
})

export type VehicleFormValues = z.infer<typeof vehicleSchema>

interface VehicleFormProps {
    initialData?: Tables<'vehicles'>
    onSubmit: (values: VehicleFormValues, newFiles: File[]) => Promise<void>
    isSubmitting: boolean
    title: string
    description: string
    submitLabel: string
}

export function VehicleForm({ initialData, onSubmit, isSubmitting, title, description, submitLabel }: VehicleFormProps) {
    const router = useRouter()
    const [isDecoding, setIsDecoding] = useState(false)
    const [isAutoPopulated, setIsAutoPopulated] = useState(!!initialData)
    const [vehicleTypes, setVehicleTypes] = useState<any[]>([])
    const [warehouses, setWarehouses] = useState<any[]>([])
    const [existingImages, setExistingImages] = useState<{ name: string, url: string }[]>([])
    const [isRemovingImage, setIsRemovingImage] = useState<string | null>(null)

    const form = useForm<VehicleFormValues>({
        resolver: zodResolver(vehicleSchema),
        defaultValues: {
            vehicle_plate: initialData?.vehicle_plate || '',
            vehicle_identification_number: initialData?.vehicle_identification_number || '',
            vehicle_make: initialData?.vehicle_make || '',
            vehicle_model: initialData?.vehicle_model || '',
            vehicle_year: initialData?.vehicle_year ?? undefined,
            vehicle_type: initialData?.vehicle_type || undefined,
            vehicle_gross_limits: initialData?.vehicle_gross_limits || 0,
            warehouse_id: initialData?.warehouse_id || undefined,
        },
    })

    const vinField = form.register('vehicle_identification_number')

    const upload = useSupabaseUpload({
        bucketName: 'vehicles',
        maxFiles: 5,
        maxFileSize: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/*'],
    })

    useEffect(() => {
        getVehicleTypes().then(setVehicleTypes)
        getWarehouses(1, 100).then(res => setWarehouses(res.data))
        if (initialData?.id) {
            const supabase = createClient()
            supabase.storage.from('vehicles').list(initialData.id).then(({ data }) => {
                if (data) {
                    const images = data.map(f => ({
                        name: f.name,
                        url: supabase.storage.from('vehicles').getPublicUrl(`${initialData.id}/${f.name}`).data.publicUrl
                    }))
                    setExistingImages(images)
                }
            })
        }
    }, [initialData])

    const handleVinDecode = async (vin: string) => {
        if (vin.length !== 17) return

        setIsDecoding(true)
        try {
            const result = await decodeVin(vin)
            const vehicle = result.vehicle
            const wmi = result.wmi
            if (result.success && vehicle && wmi) {
                const { make, model, year, gvwr } = vehicle
                const { vehicleType } = wmi
                form.setValue('vehicle_make', make || '', { shouldDirty: true })
                form.setValue('vehicle_model', model || '', { shouldDirty: true })
                form.setValue('vehicle_year', year, { shouldDirty: true })
                // Convert to kg
                form.setValue('vehicle_gross_limits', Number(gvwr ? Math.round(Number(gvwr) / 1000) : 0), { shouldDirty: true })
                if (vehicleType == 'Motorcycle') {
                    form.setValue('vehicle_type', vehicleTypes.find(t => t.vehicle_type === 'Motorbike')?.id || '', { shouldDirty: true })
                }
                if (vehicleType == 'Truck') {
                    form.setValue('vehicle_type', vehicleTypes.find(t => t.vehicle_type === 'Truck')?.id || '', { shouldDirty: true })
                }
                if (vehicleType == 'Passenger Car' || vehicleType == 'Passenger Car' || vehicleType == 'Multipurpose Passenger Vehicle (MPV)' || vehicleType == 'Low Speed Vehicle (LSV)') {
                    form.setValue('vehicle_type', vehicleTypes.find(t => t.vehicle_type === 'Van')?.id || '', { shouldDirty: true })
                }
                setIsAutoPopulated(true)
                toast.success('Vehicle details auto-populated from VIN')
            } else {
                setIsAutoPopulated(false)
                toast.error(result.error || 'Could not decode VIN. Please enter details manually.')
            }
        } catch (error) {
            console.error('VIN Decode Error:', error)
            setIsAutoPopulated(false)
            toast.error('Error decoding VIN. Please enter details manually.')
        } finally {
            setIsDecoding(false)
        }
    }

    const handleRemoveExistingImage = async (imageName: string) => {
        if (!initialData?.id) return

        setIsRemovingImage(imageName)
        try {
            const supabase = createClient()
            const { error } = await supabase.storage
                .from('vehicles')
                .remove([`${initialData.id}/${imageName}`])
            if (error) throw error
            setExistingImages(prev => prev.filter(img => img.name !== imageName))
            toast.success('Image removed')
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove image')
        } finally {
            setIsRemovingImage(null)
        }
    }


    return (
        <form onSubmit={form.handleSubmit((values) => onSubmit(values, upload.files))} className="space-y-8">
            <Card className="border-none shadow-premium bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Vehicle Identity</CardTitle>
                    <CardDescription>Enter the VIN first to auto-populate technical specifications.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="vin">Vehicle Identification Number (VIN)</Label>
                            <div className="relative">
                                <Input
                                    id="vin"
                                    placeholder="17 character VIN"
                                    maxLength={17}
                                    {...form.register('vehicle_identification_number')}
                                    onChange={(e) => {
                                        vinField.onChange(e)
                                        if (e.target.value.length === 17) {
                                            handleVinDecode(e.target.value)
                                        }
                                    }}
                                />
                                <div id="vin-status" data-testid="vin-status" className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {isDecoding ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    ) : form.watch('vehicle_identification_number')?.length == 0 ? (
                                        <></>
                                    ) : form.watch('vehicle_identification_number')?.length < 17 ? (
                                        <X className="w-4 h-4 text-destructive" />
                                    ) : isAutoPopulated ? (
                                        <CheckCircle2 className="w-4 h-4 text-primary" />
                                    ) : null}
                                </div>
                            </div>
                            {form.formState.errors.vehicle_identification_number && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {form.formState.errors.vehicle_identification_number.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="plate">Registration Plate</Label>
                            <Input
                                id="plate"
                                placeholder="ABC-123"
                                {...form.register('vehicle_plate')}
                            />
                            {form.formState.errors.vehicle_plate && (
                                <p className="text-xs text-destructive">
                                    {form.formState.errors.vehicle_plate.message}
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-premium bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Specifications</CardTitle>
                    <CardDescription>Technical details about the vehicle.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="make">Make</Label>
                        <Input
                            id="make"
                            readOnly={isAutoPopulated}
                            {...form.register('vehicle_make')}
                            className={cn(isAutoPopulated && "bg-muted cursor-not-allowed")}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="model">Model</Label>
                        <Input
                            id="model"
                            readOnly={isAutoPopulated}
                            {...form.register('vehicle_model')}
                            className={cn(isAutoPopulated && "bg-muted cursor-not-allowed")}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="year">Year</Label>
                        <Input
                            id="year"
                            type="number"
                            readOnly={isAutoPopulated}
                            {...form.register('vehicle_year', { valueAsNumber: true })}
                            className={cn(isAutoPopulated && "bg-muted cursor-not-allowed")}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">Vehicle Type</Label>
                        <Select
                            onValueChange={(val) => form.setValue('vehicle_type', val ?? "")}
                            readOnly={isAutoPopulated}
                            value={form.watch('vehicle_type')}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select type">
                                    {vehicleTypes.find(t => t.id === form.watch('vehicle_type'))?.vehicle_type}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {vehicleTypes.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                        {t.vehicle_type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="gross">Gross Limits (kg)</Label>
                        <Input
                            id="gross"
                            type="number"
                            {...form.register('vehicle_gross_limits', { valueAsNumber: true })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="warehouse">Assigned Warehouse</Label>
                        <Select
                            onValueChange={(val) => form.setValue('warehouse_id', val ?? "")}
                            value={form.watch('warehouse_id')}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select warehouse">
                                    {warehouses.find(w => w.id === form.watch('warehouse_id'))?.warehouse_name}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {warehouses.map((w) => (
                                    <SelectItem key={w.id} value={w.id}>
                                        {w.warehouse_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-premium bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Vehicle Images</CardTitle>
                    <CardDescription>Manage your vehicle photos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {existingImages.length > 0 && (
                        <div className="space-y-4">
                            <Label>Existing Photos</Label>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {existingImages.map((img) => (
                                    <div key={img.name} className="group relative aspect-square rounded-lg border overflow-hidden bg-muted">
                                        <img src={img.url} alt="Vehicle" className="object-cover w-full h-full transition group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                disabled={isRemovingImage === img.name}
                                                onClick={() => handleRemoveExistingImage(img.name)}
                                            >
                                                {isRemovingImage === img.name ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <Label>Add New Photos</Label>
                        <Dropzone {...upload} className="min-h-[150px] flex items-center justify-center">
                            <DropzoneEmptyState />
                            <DropzoneContent className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4" />
                        </Dropzone>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button variant="outline" type="button" onClick={() => router.back()}>
                    Cancel
                </Button>
                <Button type="submit" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {submitLabel}...
                        </>
                    ) : (
                        submitLabel
                    )}
                </Button>
            </div>
        </form>
    )
}
