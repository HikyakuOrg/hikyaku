import { PackageOptimisation } from "@/app/models/package-optimisation";
import { PackageStatus, PackageStatusText } from "@/app/models/package-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, MoreVertical, Navigation, Package, User } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status.toUpperCase()) {
        case "DELIVERED":
            return "default"
        case "PENDING":
        case "ASSIGNED":
            return "secondary"
        case "FAILED":
            return "destructive"
        default:
            return "outline"
    }
}

export function RouteProgressionCard({ routeSteps }: { routeSteps: PackageOptimisation[] }) {
    const warehouseInfo = routeSteps.find(s => s.package_assignment?.package?.warehouse)?.package_assignment?.package?.warehouse;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Navigation className="h-5 w-5" />
                    Route Progression
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {routeSteps.map((step, index) => {
                        return (
                            <div
                                key={step.id || index}
                                className="flex gap-4 items-start relative pb-4 last:pb-0"
                            >
                                {index !== routeSteps.length - 1 && (
                                    <div className="absolute left-[15px] top-[32px] h-full border-l-2 border-dotted border-muted-foreground/30" />
                                )}
                                <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background shadow-sm
                                    ${step.type === 'start' ? 'border-emerald-500 text-emerald-500' :
                                        step.type === 'end' ? 'border-rose-500 text-rose-500' :
                                            'border-primary text-primary'}`}>
                                    {step.type === 'start' || step.type === 'end' ? <Home className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                                </div>
                                <div className="flex-1 space-y-1 py-0.5">
                                    <div className="flex items-center justify-between">
                                        {(step.type === 'start' || step.type === 'end') ? (
                                            <Link
                                                href={warehouseInfo?.id ? `/dashboard/service/warehouse/${warehouseInfo.id}` : '#'}
                                                className="flex flex-col gap-0.5 group"
                                            >
                                                <div className="text-sm font-medium text-foreground group-hover:underline underline-offset-4 decoration-primary">
                                                    {warehouseInfo?.warehouse_name || 'Warehouse'}
                                                </div>
                                                {warehouseInfo?.warehouse_address && (
                                                    <div className="text-xs text-muted-foreground leading-snug">
                                                        {warehouseInfo.warehouse_address}
                                                    </div>
                                                )}
                                            </Link>
                                        ) : (
                                            <div className="flex flex-col gap-0.5">
                                                {step.package_assignment && (
                                                    <div>
                                                        <div className="text-sm font-medium text-foreground">
                                                            {step.package_assignment?.package?.to_customer?.customer_name || 'Recipient information missing'}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground leading-tight space-y-0.5">
                                                            <div>{step.package_assignment?.package?.to_customer?.customer_address}</div>
                                                            <div>
                                                                {step.package_assignment?.package?.to_customer?.customer_suburb}, {step.package_assignment?.package?.to_customer?.customer_state} {step.package_assignment?.package?.to_customer?.customer_postcode}
                                                            </div>
                                                            <span className="font-bold">Deliver by:</span> {step.package_assignment?.package?.package_delivery_window?.scheduled_arrival
                                                                ? format(step.package_assignment.package.package_delivery_window.scheduled_arrival, "dd MMM yyyy hh:mm a")
                                                                : "-"}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <div className="flex flex-col items-end gap-1">
                                                {step.package_assignment?.package?.current_status && (
                                                    <Badge variant={getStatusVariant(step.package_assignment.package.current_status)}>
                                                        {PackageStatusText(step.package_assignment.package.current_status as PackageStatus)}
                                                    </Badge>
                                                )}
                                                {(() => {
                                                    const dw = step.package_assignment?.package?.package_delivery_window;
                                                    if (!dw?.scheduled_arrival) return null;
                                                    const scheduled = new Date(dw.scheduled_arrival);
                                                    const isLate = dw.actual_arrival
                                                        ? new Date(dw.actual_arrival) > scheduled
                                                        : new Date() > scheduled;
                                                    return isLate ? <Badge variant="destructive">LATE</Badge> : null;
                                                })()}
                                            </div>
                                            {step.type !== 'start' && step.type !== 'end' && step.package_assignment && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger className="rounded-md p-1 hover:bg-muted transition-colors focus-visible:outline-none">
                                                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" side="bottom">
                                                        {step.package_assignment?.package?.tracking_number && (
                                                            <DropdownMenuItem>
                                                                <Link
                                                                    href={`/dashboard/packages/${step.package_assignment.package.tracking_number}`}
                                                                    className="flex items-center gap-3 w-full"
                                                                >
                                                                    <Package className="h-4 w-4" />
                                                                    View Package
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        )}
                                                        {step.package_assignment?.package?.to_customer?.id && (
                                                            <DropdownMenuItem>
                                                                <Link
                                                                    href={`/dashboard/customers/${step.package_assignment.package.to_customer.id}`}
                                                                    className="flex items-center gap-3 w-full"
                                                                >
                                                                    <User className="h-4 w-4" />
                                                                    View Customer
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
