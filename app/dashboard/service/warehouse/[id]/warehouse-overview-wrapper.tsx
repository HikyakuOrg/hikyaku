import {
    getPackagesCountInWarehouse,
    getWarehouseDriversCount,
    getWarehouseVehicleCount
} from "@/lib/supabase/db-server"
import { FleetOverview } from "../../../../../components/overview/fleet-overview"

export async function WarehouseOverviewWrapper({ warehouseId }: { warehouseId: string }) {
    const [pendingPackagesCount, driversCount, vehicleCount] = await Promise.all([
        getPackagesCountInWarehouse(warehouseId, ["PENDING"]).then(c => c ?? 0),
        getWarehouseDriversCount(warehouseId).then(c => c ?? 0),
        getWarehouseVehicleCount(warehouseId).then(c => c ?? 0)
    ])

    return (
        <FleetOverview
            pendingPackagesCount={pendingPackagesCount}
            driversCount={driversCount}
            fleetSize={vehicleCount}
        />
    )
}
