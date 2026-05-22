import Link from "next/link"

import { Button } from "@/components/ui/button"
import { getServiceAreaExtent } from "@/lib/supabase/db-server"

import { ServiceAreasMap } from "./service-areas-map"

export default async function ServiceAreasPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const initialBounds = await getServiceAreaExtent()

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="mb-2 text-3xl font-bold tracking-tight">Service Areas</h1>
                    <p className="text-muted-foreground">
                        View your delivery coverage areas on the map.
                    </p>
                </div>

                <Button>
                    <Link href={`/orgs/${slug}/dashboard/service/areas/add`}>
                        Add Service Area
                    </Link>
                </Button>
            </div>

            <ServiceAreasMap initialBounds={initialBounds ? [
                [initialBounds.minLng, initialBounds.minLat],
                [initialBounds.maxLng, initialBounds.maxLat],
            ] : null} />
        </div>
    )
}