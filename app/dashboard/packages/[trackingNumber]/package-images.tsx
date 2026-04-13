"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getPackageSignedUrls, listPackageFiles } from "@/lib/supabase/storage"

interface PackageImagesProps {
    packageId: string
}

export function PackageImages({ packageId }: PackageImagesProps) {
    const [images, setImages] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })

    useEffect(() => {
        async function fetchImages() {
            setLoading(true)
            const data = await listPackageFiles(packageId)

            if (!data || data.length === 0) {
                setLoading(false)
                return
            }

            const imagePaths = data
                // https://github.com/supabase/supabase/issues/9155#issuecomment-1257366257
                .filter(file => file.name !== '.emptyFolderPlaceholder')
                .map(file => `${packageId}/${file.name}`)

            if (imagePaths.length > 0) {
                const signedUrls = await getPackageSignedUrls(imagePaths)
                setImages(signedUrls)
            }
            setLoading(false)
        }

        fetchImages()
    }, [packageId])

    if (loading) {
        return (
            <div className="border rounded-xl p-8 flex items-center justify-center min-h-[200px] bg-muted/10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (images.length === 0) {
        return (
            <div className="border rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted/10 border-dashed min-h-[200px]">
                <div className="p-3 bg-primary/10 rounded-full mb-3">
                    <ImageIcon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-1">No Photos</h3>
                <p className="text-sm text-muted-foreground max-w-[200px]">
                    No photos have been uploaded for this package yet.
                </p>
            </div>
        )
    }

    return (
        <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
            <div className="p-5 border-b bg-muted/30 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <ImageIcon className="h-4 w-4 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-sm">Package Photos</h3>
                    <p className="text-xs text-muted-foreground">{images.length} {images.length === 1 ? 'photo' : 'photos'} available</p>
                </div>
            </div>

            <div className="p-5">
                <div className="relative group">
                    <div className="overflow-hidden rounded-lg bg-muted/20" ref={emblaRef}>
                        <div className="flex">
                            {images.map((img, idx) => (
                                <div className="flex-[0_0_100%] min-w-0 relative aspect-video" key={idx}>
                                    <img
                                        src={img}
                                        alt={`Package photo ${idx + 1}`}
                                        className="object-contain w-full h-full rounded-lg"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {images.length > 1 && (
                        <>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border shadow-sm"
                                onClick={() => emblaApi?.scrollPrev()}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border shadow-sm"
                                onClick={() => emblaApi?.scrollNext()}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
