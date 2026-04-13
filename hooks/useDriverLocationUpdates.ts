import { subscribeToDriverLocationUpdates } from "@/lib/supabase/db"
import { useEffect, useState } from "react"

export type DriverCurrentLocation = {
    driver_id: string
    location: Point
    updated_at: string
    created_at: string
}


export function useDriverLocationUpdates(driverId: string) {
    const [location, setLocation] = useState<DriverCurrentLocation | null>(null)

    useEffect(() => {
        if (!driverId) return
        const channel = subscribeToDriverLocationUpdates(
            driverId,
            (payload) => {
                setLocation(payload.new)
            }
        )

        return () => {
            channel.unsubscribe()
        }
    }, [driverId])

    return {
        location,
    }

}


