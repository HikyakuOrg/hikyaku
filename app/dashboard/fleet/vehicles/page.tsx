import { FleetInventory } from "./fleet-inventory";

export default async function VehiclesPage() {
    

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Vehicles</h1>
                <p className="text-muted-foreground">
                    Manage your vehicles.
                </p>
            </div>
            <FleetInventory
            />

        </div>
    )
}