import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Warehouse as WarehouseIcon } from "lucide-react"

function CustomProgress({ value }: { value: number }) {
    return (
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${value}%` }}
            />
        </div>
    )
}

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
                            // Simulating a "capacity" for visual effect, let's say 100 units is "full" for display purposes
                            const capacity = 100
                            const percentage = Math.min((warehouse.package_count / capacity) * 100, 100)

                            return (
                                <div key={warehouse.id} className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium">{warehouse.warehouse_name}</span>
                                        <span className="text-muted-foreground">{warehouse.package_count} Units</span>
                                    </div>
                                    <CustomProgress value={percentage} />
                                </div>
                            )
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
