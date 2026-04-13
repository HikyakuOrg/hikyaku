
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { VehiclesWithTypes } from '@/lib/supabase/db';
import { getSignedUrls, listVehicleFiles } from '@/lib/supabase/storage';
import { useEffect, useState } from 'react';

interface FleetInventoryProps {
    vehicles: VehiclesWithTypes[];
}

export function FleetGrid({ vehicles }: FleetInventoryProps) {


    const [vehicleImages, setVehicleImages] = useState<Record<string, string[]>>({})
    const [currentIndex, setCurrentIndex] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadImages() {
            const imageMap: Record<string, string[]> = {}

            for (const v of vehicles) {
                const files = await listVehicleFiles(v.id)
                if (files.length > 0) {
                    const filePaths = files.map((file) => `${v.id}/${file.name}`)
                    const signedUrls = await getSignedUrls(filePaths)
                    imageMap[v.id] = signedUrls
                }
            }

            setVehicleImages(imageMap)
            setLoading(false)
        }

        loadImages()
    }, [vehicles])

    const nextImage = (vehicleId: string) => {
        setCurrentIndex((prev) => ({
            ...prev,
            [vehicleId]:
                ((prev[vehicleId] ?? 0) + 1) %
                (vehicleImages[vehicleId]?.length || 1),
        }))
    }

    const prevImage = (vehicleId: string) => {
        setCurrentIndex((prev) => ({
            ...prev,
            [vehicleId]:
                ((prev[vehicleId] ?? 0) - 1 +
                    (vehicleImages[vehicleId]?.length || 1)) %
                (vehicleImages[vehicleId]?.length || 1),
        }))
    }


    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {vehicles.map((v) => {
                const images = vehicleImages[v.id] || []
                const index = currentIndex[v.id] ?? 0

                return (
                    <Card
                        key={v.id}
                        className="cursor-pointer hover:shadow-lg">
                        <CardHeader>
                            <CardTitle>{v.vehicle_plate || 'No Plate'}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            <div>{v.vehicle_make} {v.vehicle_model}</div>
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
                                                onClick={() =>
                                                    prevImage(v.id)
                                                }
                                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white px-2 py-1 rounded">
                                                ‹
                                            </button>

                                            <button
                                                onClick={() =>
                                                    nextImage(v.id)
                                                }
                                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white px-2 py-1 rounded">
                                                ›
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="text-sm text-muted-foreground">{v.vehicle_year}</div>
                            <div className="text-xs text-muted-foreground truncate">{v.vehicle_identification_number}</div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    )
}