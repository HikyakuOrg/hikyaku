'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getSignedUrls, listVehicleFiles } from '@/lib/supabase/storage'
import { useRouter } from 'next/navigation'

export interface VehicleCardData {
    id: string
    vehicle_plate?: string | null
    vehicle_make?: string | null
    vehicle_model?: string | null
    vehicle_year?: number | string | null
    vehicle_identification_number?: string | null
    is_deleted?: boolean
}

interface VehicleCardProps {
    vehicle: VehicleCardData
    href?: string
    className?: string
}

export function VehicleCard({ vehicle, href, className }: VehicleCardProps) {
    const router = useRouter()
    const [images, setImages] = useState<string[]>([])
    const [index, setIndex] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadImages() {
            const files = await listVehicleFiles(vehicle.id)
            if (files.length > 0) {
                const filePaths = files.map((file) => `${vehicle.id}/${file.name}`)
                const signedUrls = await getSignedUrls(filePaths)
                setImages(signedUrls)
            }
            setLoading(false)
        }
        loadImages()
    }, [vehicle.id])

    const prev = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIndex((i) => (i - 1 + images.length) % images.length)
    }

    const next = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIndex((i) => (i + 1) % images.length)
    }

    return (
        <Card
            onClick={href ? () => router.push(href) : undefined}
            className={cn(
                'relative overflow-hidden',
                href && 'cursor-pointer hover:shadow-lg',
                vehicle.is_deleted && 'opacity-75 grayscale-[0.5]',
                className,
            )}
        >
            {vehicle.is_deleted && (
                <div className="absolute top-2 right-2 z-10">
                    <Badge variant="destructive" className="uppercase font-bold tracking-wider">Deleted</Badge>
                </div>
            )}
            <CardHeader>
                <CardTitle>{vehicle.vehicle_plate || 'No Plate'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
                <div>{vehicle.vehicle_make} {vehicle.vehicle_model}</div>
                {loading ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <Spinner className="size-6" />
                    </div>
                ) : images.length === 0 ? (
                    <div className="w-full h-48 bg-muted flex items-center justify-center text-sm text-muted-foreground rounded-md">
                        No Image
                    </div>
                ) : (
                    <div className="relative">
                        <img
                            src={images[index]}
                            className="w-full h-48 object-cover rounded-md"
                        />
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={prev}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white px-2 py-1 rounded">
                                    ‹
                                </button>
                                <button
                                    onClick={next}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white px-2 py-1 rounded">
                                    ›
                                </button>
                            </>
                        )}
                    </div>
                )}
                {vehicle.vehicle_year && (
                    <div className="text-sm text-muted-foreground">{vehicle.vehicle_year}</div>
                )}
                {vehicle.vehicle_identification_number && (
                    <div className="text-xs text-muted-foreground truncate">{vehicle.vehicle_identification_number}</div>
                )}
            </CardContent>
            {vehicle.is_deleted && (
                <div className="bg-destructive/10 border-t border-destructive/20 py-2 px-4 text-center">
                    <span className="text-[10px] font-bold uppercase text-destructive tracking-widest">Historical Record - Deleted</span>
                </div>
            )}
        </Card>
    )
}
