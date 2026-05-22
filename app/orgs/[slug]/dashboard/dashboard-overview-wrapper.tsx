import { FleetOverview } from "@/components/overview/fleet-overview";



export async function DashboardOverviewWrapper() {

    return (
        <FleetOverview
            pendingPackagesCount={0}
            driversCount={0}
            fleetSize={0}
        />
    )
}
