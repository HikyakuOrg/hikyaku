import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface FleetOverviewProps {
    pendingPackagesCount: number
    driversCount: number
    fleetSize: number
}

export function FleetOverview({ pendingPackagesCount, driversCount, fleetSize }: FleetOverviewProps) {

    return (
        <div className="xl:col-span-2 space-y-8">
            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4`}>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">Pending Packages</CardTitle>
                    </CardHeader>
                    <CardContent>

                        <div className="text-2xl font-bold">{pendingPackagesCount} <span className="text-sm font-normal text-text-secondary-light dark:text-text-secondary-dark">Units</span></div>

                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">Total Drivers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{driversCount} <span className="text-sm font-normal text-text-secondary-light dark:text-text-secondary-dark">Drivers</span></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Fleet Size</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{fleetSize} <span className="text-sm font-normal text-text-secondary-light dark:text-text-secondary-dark">Vehicles</span></div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}