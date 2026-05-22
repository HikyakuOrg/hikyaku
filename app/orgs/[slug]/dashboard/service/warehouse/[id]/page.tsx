import { getWarehouse } from "@/lib/supabase/db-server"
import { WarehouseNameCrumb } from "./warehouse-crumb"
import { WarehouseMap } from "./warehouse-map"
import { WarehouseTabs } from "./warehouse-tabs"
import { Suspense } from "react"
import { WarehouseOverviewWrapper } from "./warehouse-overview-wrapper"
import { OverviewSkeleton } from "@/components/overview/overview-skeleton"

export default async function Page({ params }: { params: { id: string } }) {


    const { id } = await params
    const warehouse = await getWarehouse(id)

    if (!warehouse) {
        return (
            <div>
                Warehouse not found
            </div>
        )
    }

    const warehouseLatLon = warehouse.warehouse_location as Point
    
    return (
        <div className="p-6 space-y-6">
            <WarehouseNameCrumb warehouseName={warehouse.warehouse_name} />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                    <Suspense fallback={<OverviewSkeleton />}>
                        <WarehouseOverviewWrapper warehouseId={id} />
                    </Suspense>
                    <WarehouseTabs warehouseId={id} />
                </div>
                <WarehouseMap 
                        warehouseAddress={warehouse.warehouse_address}
                        warehouseCity={warehouse.warehouse_city}
                        warehouseState={warehouse.warehouse_state} 
                        warehouseCountry={warehouse.warehouse_country}
                        warehouseLatLng={warehouseLatLon}                 
                    />
            </div>
        </div>
    )
}   