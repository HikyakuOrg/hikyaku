import MapView from "@/components/map/map-view"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface WarehouseProps {
    warehouseAddress: string
    warehouseCity: string
    warehouseState: string
    warehouseCountry: string
    warehouseLatLng: Point
}

export async function WarehouseMap({ warehouseAddress, warehouseCity, warehouseState, warehouseCountry, warehouseLatLng }: WarehouseProps) {
    
    return (
        <div className="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark overflow-hidden shadow-sm">
            <Card>
                <MapView
                    container={""}
                    interactive={false}
                    zoom={11}
                    center={[warehouseLatLng.coordinates[0], warehouseLatLng.coordinates[1]]}
                />
                <CardContent>
                    <CardTitle>Warehouse Location</CardTitle>
                    <CardDescription>{warehouseAddress}</CardDescription>
                    <CardDescription>{warehouseCity}, {warehouseState}, {warehouseCountry}</CardDescription>
                   
                </CardContent>
            </Card>
        </div>
    )
}