import { fetchRoutePreview } from "@/lib/api/routing";
import { RouteMap, RouteStep } from "./route-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { RouteProgressionCard } from "./route-progression-card";
import { getRouteSteps, getDriverCurrentLocation } from "@/lib/supabase/db-server";
import { getDriversByIds } from "@/lib/supabase/supabase-rpc";
import Link from "next/link";
import { VehicleCard } from "@/app/orgs/[slug]/dashboard/fleet/vehicles/components/vehicle-card";

export default async function DriverShiftsDetails({ params }: { params: Promise<{ id: string; slug: string }> }) {
    const { id, slug } = await params;

    const routeSteps = await getRouteSteps(id);
    const routeStepArray: RouteStep[] = [];
    const routeCoords: [number, number][] = [];

    const assignment = routeSteps.find(s => s.package_assignment?.package?.warehouse)?.package_assignment;
    const warehouseInfo = assignment?.package?.warehouse;

    let stopNumber = 0;

    routeSteps.forEach((routeStep) => {
        const pkg = routeStep.package_assignment?.package;
        routeStepArray.push({
            coords: routeStep.location.coordinates,
            type: routeStep.type as ('start' | 'end' | 'job'),
            warehouse_name: warehouseInfo?.warehouse_name,
            warehouse_address: warehouseInfo?.warehouse_address,
            customer_name: pkg?.to_customer?.customer_name,
            customer_address: pkg?.to_customer?.customer_address,
            stop_number: pkg ? ++stopNumber : undefined,
            status: pkg?.current_status ?? undefined,
        })
        routeCoords.push([routeStep.location.coordinates[0], routeStep.location.coordinates[1]])
    })

    const vehicle = assignment?.vehicle;

    const vehicleType = vehicle?.vehicle_type.ors_vehicle_type ?? "driving-car"
    const route = await fetchRoutePreview(vehicleType, routeCoords, slug);
    const summary = route.summary;

    const driver = assignment?.driver;

    const driverProfile = await getDriversByIds([driver?.id ?? ""])
    const driverLocation = await getDriverCurrentLocation(driver?.id ?? "")

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Shift Details</h1>
                </div>
                <p className="text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Optimized route and step progression
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <RouteMap routeSteps={routeStepArray} route={route} driverId={driver?.id} driverLocation={driverLocation} />

                    <RouteProgressionCard routeSteps={routeSteps} routeId={id} />
                </div>

                <div className="space-y-6">
                    {vehicle && (
                        <VehicleCard
                            vehicle={vehicle}
                            href={`/orgs/${slug}/dashboard/fleet/vehicles/${vehicle.id}`}
                        />
                    )}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Route Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {driver && (
                                <div className="flex justify-between items-start py-2 border-b">
                                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                                        Driver
                                    </span>
                                    <div className="text-right">
                                        <Link href={`/orgs/${slug}/dashboard/fleet/team-members/${driver?.id}`}>
                                            <div className="font-semibold text-sm hover:underline">{driverProfile[0].display_name}</div>
                                        </Link>
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-sm text-muted-foreground">Total Distance</span>
                                <span className="font-semibold">{(summary?.distance ? (summary.distance / 1000).toFixed(1) : 0)} km</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-sm text-muted-foreground">Estimated Time</span>
                                <span className="font-semibold">{(summary?.duration ? (summary.duration / 3600).toFixed(1) : 0)} hours</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-muted-foreground">Stops</span>
                                <span className="font-semibold">{routeSteps.filter(s => s.package_assignment?.package).length}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}