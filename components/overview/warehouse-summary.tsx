import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Warehouse as WarehouseIcon } from "lucide-react"

interface WarehouseData {
    id: string
    warehouse_name: string
    package_count: number
}

interface WarehouseSummaryProps {
    warehouses: WarehouseData[]
}

export function WarehouseSummary({ warehouses }: WarehouseSummaryProps) {
    return (
        <Card className="col-span-1 lg:col-span-2 border-none bg-card/50 backdrop-blur-sm shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <WarehouseIcon className="h-5 w-5 text-primary" />
                    Warehouse Operations
                </CardTitle>
                <p className="text-sm text-muted-foreground">Current package volume by location</p>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {warehouses.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No warehouse data available.</p>
                    ) : (
                        warehouses.map((warehouse) => {
                            return (
                                <div key={warehouse.id} className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium">{warehouse.warehouse_name}</span>
                                        <span className="text-muted-foreground">{warehouse.package_count} Units</span>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
