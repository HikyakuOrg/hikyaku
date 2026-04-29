import Link from "next/link"

import { Button } from "@/components/ui/button"
import { getServiceAreas } from "@/lib/supabase/db-server"

import { ServiceAreasMap } from "./service-areas-map"

export default async function ServiceAreasPage() {
    const featureCollection = await getServiceAreas()

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
                    <Link href="/dashboard/service/areas/add">
                        Add Service Area
                    </Link>
                </Button>
            </div>

            <ServiceAreasMap featureCollection={featureCollection} />
        </div>
    )
}