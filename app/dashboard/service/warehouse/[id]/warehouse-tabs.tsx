
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { WarehouseDriverCard } from "./warehouse-driver-card"
import { WarehouseVehicleCard } from "./warehouse-vehicle-card"
import { WarehousePackagesCard } from "./warehouse-packages-card"


export async function WarehouseTabs({ warehouseId }: { warehouseId: string }) {


    return (
        <div>
            <Tabs defaultValue="packages" className="w-full">
                <TabsList variant="line">
                    <TabsTrigger value="packages">Packages</TabsTrigger>
                    <TabsTrigger value="drivers">Drivers</TabsTrigger>
                    <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
                </TabsList>
                <TabsContent value="packages">
                    <WarehousePackagesCard warehouseId={warehouseId} />
                </TabsContent>
                <TabsContent value="drivers">
                    <WarehouseDriverCard warehouseId={warehouseId} />
                </TabsContent>
                <TabsContent value="vehicles">
                    <WarehouseVehicleCard warehouseId={warehouseId} />
                </TabsContent>
            </Tabs>

        </div>
    )
}