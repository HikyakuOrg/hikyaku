'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createVehicle, getVehicleTypes, getWarehouses } from '@/lib/supabase/db'
import { toast } from 'sonner'
import { Loader2, Upload, CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react'
import { createDecoder } from '@cardog/corgi/browser'
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const vehicleSchema = z.object({
    vehicle_plate: z.string().min(1, 'Plate number is required'),
    vehicle_identification_number: z.string().length(17, 'VIN must be 17 characters'),
    vehicle_make: z.string().min(1, 'Make is required'),
    vehicle_model: z.string().min(1, 'Model is required'),
    vehicle_year: z.number().min(1900).max(new Date().getFullYear() + 1),
    vehicle_type: z.string().uuid('Please select a vehicle type'),
    vehicle_gross_limits: z.number().positive('Gross limits must be positive'),
    warehouse_id: z.string().uuid('Please select a warehouse'),
})

type VehicleFormValues = z.infer<typeof vehicleSchema>

export default function AddVehiclePage() {
    const router = useRouter()
    const [isDecoding, setIsDecoding] = useState(false)
    const [isAutoPopulated, setIsAutoPopulated] = useState(false)
    const [vehicleTypes, setVehicleTypes] = useState<any[]>([])
    const [warehouses, setWarehouses] = useState<any[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<VehicleFormValues>({
        resolver: zodResolver(vehicleSchema),
        defaultValues: {
            vehicle_plate: '',
            vehicle_identification_number: '',
            vehicle_make: '',
            vehicle_model: '',
            vehicle_year: new Date().getFullYear(),
            vehicle_gross_limits: 0,
        },
    })

    const upload = useSupabaseUpload({
        bucketName: 'vehicles',
        maxFiles: 5,
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ['image/*'],
    })

    useEffect(() => {
        getVehicleTypes().then(setVehicleTypes)
        getWarehouses(1, 100).then(res => setWarehouses(res.data))
    }, [])

    const handleVinDecode = async (vin: string) => {
        if (vin.length !== 17) return

        setIsDecoding(true)
        try {
            const decoder = await createDecoder({
                databasePath: "https://corgi.cardog.io/vpic.lite.db.gz",
                runtime: "browser",
            })
            const result = await decoder.decode(vin)
            
            if (result.valid && result.components.vehicle) {
                const { make, model, year } = result.components.vehicle
                form.setValue('vehicle_make', make || '')
                form.setValue('vehicle_model', model || '')
                form.setValue('vehicle_year', year || new Date().getFullYear())
                setIsAutoPopulated(true)
                toast.success('Vehicle details auto-populated from VIN')
            } else {
                setIsAutoPopulated(false)
                toast.error('Could not decode VIN. Please enter details manually.')
            }
        } catch (error) {
            console.error('VIN Decode Error:', error)
            setIsAutoPopulated(false)
            toast.error('Error decoding VIN. Please enter details manually.')
        } finally {
            setIsDecoding(false)
        }
    }

    const onSubmit = async (values: VehicleFormValues) => {
        setIsSubmitting(true)
        try {
            // 1. Create vehicle record
            const vehicle = await createVehicle({
                ...values,
                is_deleted: false
            } as any)

            // 2. Upload images if any
            if (upload.files.length > 0) {
                const supabase = createClient()
                const promises = upload.files.map(async (file) => {
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
            router.push('/dashboard/fleet/vehicles')
        } catch (error: any) {
            toast.error(error.message || 'Failed to add vehicle')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
            <div className="flex items-center gap-4 mb-2">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Add New Vehicle</h1>
                    <p className="text-muted-foreground">Expand your fleet by adding a new vehicle record.</p>
                </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                                        placeholder="17-character VIN"
                                        maxLength={17}
                                        className="uppercase pr-10"
                                        {...form.register('vehicle_identification_number')}
                                        onChange={(e) => {
                                            form.register('vehicle_identification_number').onChange(e)
                                            if (e.target.value.length === 17) {
                                                handleVinDecode(e.target.value)
                                            }
                                        }}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {isDecoding ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
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
                                    placeholder="e.g. ABC-123"
                                    className="uppercase"
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
                                disabled={isAutoPopulated}
                                {...form.register('vehicle_make')}
                                className={cn(isAutoPopulated && "bg-muted cursor-not-allowed")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="model">Model</Label>
                            <Input
                                id="model"
                                disabled={isAutoPopulated}
                                {...form.register('vehicle_model')}
                                className={cn(isAutoPopulated && "bg-muted cursor-not-allowed")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="year">Year</Label>
                            <Input
                                id="year"
                                type="number"
                                disabled={isAutoPopulated}
                                {...form.register('vehicle_year', { valueAsNumber: true })}
                                className={cn(isAutoPopulated && "bg-muted cursor-not-allowed")}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type">Vehicle Type</Label>
                            <Select 
                                onValueChange={(val) => form.setValue('vehicle_type', val)}
                                value={form.watch('vehicle_type')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {vehicleTypes.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.vehicle_type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.vehicle_type && (
                                <p className="text-xs text-destructive">{form.formState.errors.vehicle_type.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="gross">Gross Limits (kg)</Label>
                            <Input
                                id="gross"
                                type="number"
                                {...form.register('vehicle_gross_limits', { valueAsNumber: true })}
                            />
                            {form.formState.errors.vehicle_gross_limits && (
                                <p className="text-xs text-destructive">{form.formState.errors.vehicle_gross_limits.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="warehouse">Assigned Warehouse</Label>
                            <Select 
                                onValueChange={(val) => form.setValue('warehouse_id', val)}
                                value={form.watch('warehouse_id')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select warehouse" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((w) => (
                                        <SelectItem key={w.id} value={w.id}>
                                            {w.warehouse_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.warehouse_id && (
                                <p className="text-xs text-destructive">{form.formState.errors.warehouse_id.message}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-premium bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Vehicle Images</CardTitle>
                        <CardDescription>Drag and drop images of the vehicle. Max 5 files.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Dropzone {...upload} className="min-h-[200px] flex items-center justify-center">
                            <DropzoneEmptyState />
                            <DropzoneContent className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4" />
                        </Dropzone>
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
                                Creating Vehicle...
                            </>
                        ) : (
                            'Save Vehicle'
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}
