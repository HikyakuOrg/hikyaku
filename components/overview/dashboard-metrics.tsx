import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Truck, Warehouse, PackageCheck } from "lucide-react"

interface DashboardMetricsProps {
    pendingPackagesCount: number
    driversCount: number
    fleetSize: number
    warehousesCount: number
    outForDeliveryCount: number
}

export function DashboardMetrics({
    pendingPackagesCount,
    driversCount,
    fleetSize,
    warehousesCount,
    outForDeliveryCount,
}: DashboardMetricsProps) {
    const metrics = [
        {
            title: "Pending Packages",
            value: pendingPackagesCount,
            unit: "Units",
            icon: Package,
            description: "",
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            title: "Out for Delivery",
            value: outForDeliveryCount,
            unit: "Packages",
            icon: PackageCheck,
            description: "Currently being delivered",
            color: "text-teal-500",
            bg: "bg-teal-500/10"
        },
        {
            title: "Active Drivers",
            value: driversCount,
            unit: "Drivers",
            icon: Truck,
            description: "Currently on the fleet",
            color: "text-green-500",
            bg: "bg-green-500/10"
        },
        {
            title: "Fleet Size",
            value: fleetSize,
            unit: "Vehicles",
            icon: Truck,
            description: "Total vehicles available",
            color: "text-purple-500",
            bg: "bg-purple-500/10"
        },
        {
            title: "Global Warehouses",
            value: warehousesCount,
            unit: "Warehouses",
            icon: Warehouse,
            description: "Strategic distribution hubs",
            color: "text-orange-500",
            bg: "bg-orange-500/10"
        }
    ]

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {metrics.map((metric) => (
                <Card key={metric.title} className="overflow-hidden border-none bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {metric.title}
                        </CardTitle>
                        <div className={`p-2 rounded-lg ${metric.bg}`}>
                            <metric.icon className={`h-4 w-4 ${metric.color}`} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {metric.value}
                            <span className="ml-1 text-sm font-normal text-muted-foreground">
                                {metric.unit}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {metric.description}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
