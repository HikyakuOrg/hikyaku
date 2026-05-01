"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { getDriversByIds } from "@/lib/supabase/supabase-rpc"
import { useDriverLocationUpdates } from "@/hooks/useDriverLocationUpdates"
import DriverMap from "./driver-map"
import { Spinner } from "@/components/ui/spinner"
import { getDriverPackageAssignmentStatus } from "@/lib/supabase/db"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import LocationHistoryCard from "./location-history-card"
import { useDriverPresenceStatus } from "@/hooks/useDriverPresenceStatus"


export default function DriverDetailsPage() {
    const params = useParams()
    const driverId = params.id as string

    const [driver, setDriver] = useState<any | null>(null)
    const [packages, setPackages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const { location } = useDriverLocationUpdates(driverId ?? "")
    const { isOnline, isLoading: isPresenceLoading } = useDriverPresenceStatus(driverId ?? "")

    useEffect(() => {
        if (!driverId) return

        setLoading(true)

        getDriversByIds([driverId])
            .then((arr) => {
                if (arr && arr.length > 0) setDriver(arr[0])
            })
            .catch((e) => console.error("Error fetching driver", e))
            .finally(() => setLoading(false))
    }, [driverId])

    useEffect(() => {
        if (!driverId) return


        async function fetchPackages() {
            try {
                const data = await getDriverPackageAssignmentStatus(driverId)

                const mapped = (data ?? []).map((row: any) => ({
                    assignmentId: row.id ?? null,
                    assignedAt: row.created_at,
                    package: row.package ?? null,
                }))

                setPackages(mapped)
            } catch (e) {
                console.error(e)
            }
        }

        fetchPackages()
    }, [driverId])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <Spinner className="h-8 w-8" />
            </div>
        )
    }

    const deliveredCount = packages.filter(
        (p) => p.package?.current_status === "Delivered"
    ).length


    return (
        <div className="p-6 space-y-8">

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-semibold">
                        {driver?.display_name ?? "Driver"}
                    </h1>
                </div>
                <Button
                    onClick={() => router.push(`/dashboard/fleet/drivers/${driverId}/edit`)}
                    variant="outline"
                >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Driver
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                <div className="border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Packages Assigned</p>
                    <p className="text-2xl font-semibold">{packages.length}</p>
                </div>

                <div className="border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Delivered</p>
                    <p className="text-2xl font-semibold">{deliveredCount}</p>
                </div>

                <div className="border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Last Location Update</p>
                    <p className="text-sm">
                        {location
                            ? new Date(location.updated_at).toLocaleString()
                            : "—"}
                    </p>
                </div>

                <div className="border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Online Status</p>
                    <p className="text-2xl font-semibold">
                        {isPresenceLoading ? "Checking" : isOnline ? "Online" : "Offline"}
                    </p>
                </div>
            </div>

            <div className="border rounded-lg p-6">
                <h2 className="font-medium mb-4">Driver Profile</h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">

                    <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium">{driver?.phone_number ?? "—"}</p>
                    </div>

                    <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{driver?.email ?? "—"}</p>
                    </div>

                    <div>
                        <p className="text-muted-foreground">Warehouse</p>
                        <p className="font-medium">
                            {driver?.warehouse_name ?? driver?.warehouse_id ?? "—"}
                        </p>
                    </div>

                    <div>
                        <p className="text-muted-foreground">License</p>
                        <p className="font-medium">{driver?.driver_license ?? "—"}</p>
                    </div>

                    <div>
                        <p className="text-muted-foreground">License Expiry</p>
                        <p className="font-medium">{driver?.license_expiry ?? "—"}</p>
                    </div>

                </div>
            </div>

            <div className="border rounded-lg p-4">
                <h2 className="font-medium mb-3">Current Location</h2>
                {location ? (
                    <div className="w-full h-[500px] rounded-md overflow-hidden border">
                        <DriverMap
                            lat={location.location.coordinates[1]}
                            lng={location.location.coordinates[0]}
                        />
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        No live location available
                    </p>
                )}
            </div>

            <div className="border rounded-lg p-6">
                <h2 className="font-medium mb-4">
                    Packages (Assigned / Delivered)
                </h2>

                {packages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No packages found for this driver.
                    </p>
                ) : (
                    <ul className="divide-y">
                        {packages.map((p) => (
                            <li
                                key={p.assignmentId}
                                className="flex items-center justify-between py-4"
                            >
                                <div>
                                    <p className="font-medium">
                                        {p.package?.tracking_number ?? p.package?.id}
                                    </p>

                                    <p className="text-sm text-muted-foreground">
                                        Status:{" "}
                                        {p.package?.current_status ??
                                            p.package?.current_status_id}
                                    </p>
                                </div>

                                <div className="text-sm text-muted-foreground">
                                    Assigned:{" "}
                                    {new Date(p.assignedAt).toLocaleString()}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <LocationHistoryCard driverId={driverId} />

        </div>
    )
}