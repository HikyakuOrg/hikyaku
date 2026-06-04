'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getVehicleWithFullDetails, deleteVehicle } from '@/lib/supabase/db'
import { getSignedUrls, listVehicleFiles } from '@/lib/supabase/storage'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/utils'
import { 
    ChevronLeft, 
    Loader2, 
    Truck, 
    User as UserIcon, 
    Package, 
    Edit, 
    Trash2,
    ArrowUpRight,
    Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { format } from 'date-fns'
import { VehicleDriverSheet } from './vehicle-driver-sheet'

export default function VehicleOverviewPage() {
    const router = useRouter()
    const { id, slug } = useParams() as { id: string; slug: string }
    
    const [data, setData] = useState<Awaited<ReturnType<typeof getVehicleWithFullDetails>> | null>(null)
    const [images, setImages] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        if (id) {
            loadData()
        }
    }, [id])

    const loadData = async () => {
        try {
            const result = await getVehicleWithFullDetails(id)
            setData(result)

            // Load images
            const files = await listVehicleFiles(id)
            if (files.length > 0) {
                const filePaths = files.map(f => `${id}/${f.name}`)
                const urls = await getSignedUrls(filePaths)
                setImages(urls)
            }
        } catch (err) {
            toast.error('Failed to load vehicle details')
            router.push(`/orgs/${slug}/dashboard/fleet/vehicles`)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this vehicle?')) return
        
        setIsDeleting(true)
        try {
            await deleteVehicle(id)
            toast.success('Vehicle deleted successfully')
            router.push(`/orgs/${slug}/dashboard/fleet/vehicles`)
        } catch (error) {
            toast.error(getErrorMessage(error) || 'Failed to delete vehicle')
            setIsDeleting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        )
    }

    if (!data) return null

    const { vehicle, currentDriver, deliveries } = data

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/orgs/${slug}/dashboard/fleet/vehicles`)}>
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight">{vehicle.vehicle_plate}</h1>
                            {vehicle.is_deleted && <Badge variant="destructive">Deleted</Badge>}
                        </div>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => router.push(`/orgs/${slug}/dashboard/fleet/vehicles/${id}/edit`)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Vehicle Specs */}
                <Card className="lg:col-span-2 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Vehicle Information</h3>
                                <dl className="grid grid-cols-2 gap-y-4 text-sm">
                                    <dt className="text-muted-foreground">Make</dt>
                                    <dd className="font-medium text-right md:text-left">{vehicle.vehicle_make}</dd>
                                    
                                    <dt className="text-muted-foreground">Model</dt>
                                    <dd className="font-medium text-right md:text-left">{vehicle.vehicle_model}</dd>
                                    
                                    <dt className="text-muted-foreground">Year</dt>
                                    <dd className="font-medium text-right md:text-left">{vehicle.vehicle_year}</dd>
                                    
                                    <dt className="text-muted-foreground">Type</dt>
                                    <dd className="font-medium text-right md:text-left">{vehicle.vehicle_type?.vehicle_type}</dd>
                                </dl>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="text-lg font-semibold mb-4">Technical Specs</h3>
                                <dl className="grid grid-cols-2 gap-y-4 text-sm">
                                    <dt className="text-muted-foreground">VIN</dt>
                                    <dd className="font-mono font-medium text-right md:text-left truncate" title={vehicle.vehicle_identification_number ?? undefined}>
                                        {vehicle.vehicle_identification_number}
                                    </dd>
                                    
                                    <dt className="text-muted-foreground">Gross Limits</dt>
                                    <dd className="font-medium text-right md:text-left">{vehicle.vehicle_gross_limits} kg</dd>
                                </dl>
                            </div>
                        </div>

                        {/* Image Gallery */}
                        <div className="bg-muted p-6 flex flex-col gap-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Vehicle Gallery</h3>
                            {images.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {images.map((url, i) => (
                                        <img 
                                            key={i} 
                                            src={url} 
                                            className="w-full h-32 object-cover rounded-lg shadow-sm border bg-background" 
                                            alt={`Vehicle ${i+1}`}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                                    <Truck className="w-12 h-12 mb-2 opacity-20" />
                                    <p className="text-xs">No images available for this vehicle.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Assigned Driver */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Assigned Driver</CardTitle>
                        <CardDescription>Current primary operator</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {currentDriver ? (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <Avatar className="w-16 h-16 border-2 border-primary/10">
                                        <AvatarImage src={currentDriver.avatar_url} />
                                        <AvatarFallback className="bg-primary/5 text-primary text-xl uppercase italic">
                                            {currentDriver.display_name?.substring(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h4 className="font-bold text-lg">{currentDriver.display_name}</h4>
                                        <p className="text-sm text-muted-foreground">{currentDriver.email}</p>
                                    </div>
                                </div>
                                <div className="space-y-4 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">License</span>
                                        <span className="font-medium">{currentDriver.driver_license || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Phone</span>
                                        <span className="font-medium">{currentDriver.phone_number || 'N/A'}</span>
                                    </div>
                                    <Button variant="secondary" className="w-full" onClick={() => router.push(`/orgs/${slug}/dashboard/fleet/team-members/${currentDriver.id}`)}>
                                        View Driver Profile
                                        <ArrowUpRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                    <UserIcon className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">No Driver Assigned</p>
                                    <p className="text-xs text-muted-foreground px-4">Assign a driver to this vehicle to start tracking shifts.</p>
                                </div>
                                <VehicleDriverSheet vehicleId={id} onDriverAssigned={loadData} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Deliveries Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Recent Deliveries</CardTitle>
                        <CardDescription>Historical and active packages assigned to this vehicle.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {deliveries.length > 0 ? (
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Tracking #</TableHead>
                                        <TableHead>From</TableHead>
                                        <TableHead>To</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Assigned On</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {deliveries.map((d) => (
                                        <TableRow key={d.package_id} className="hover:bg-muted/30">
                                            <TableCell className="font-mono font-medium">{d.package?.tracking_number}</TableCell>
                                            <TableCell className="text-sm">{d.package?.from_customer?.customer_name}</TableCell>
                                            <TableCell className="text-sm">{d.package?.to_customer?.customer_name}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-[10px] uppercase font-bold px-1.5 py-0">
                                                    PENDING
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-xs italic">
                                                {format(new Date(d.created_at), 'MMM d, yyyy HH:mm')}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg">
                            <Package className="w-12 h-12 mb-3 opacity-20" />
                            <h4 className="font-medium text-foreground">No Deliveries Found</h4>
                            <p className="text-sm max-w-[250px]">This vehicle has not been used for any deliveries yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
