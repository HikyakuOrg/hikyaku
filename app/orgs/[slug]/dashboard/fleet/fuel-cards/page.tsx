import { FuelCardsClient } from "./fuel-cards-client"

export default async function FuelCardsPage() {
    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Fuel Cards</h1>
                <p className="text-muted-foreground">
                    Issue and manage virtual fuel cards for your drivers.
                </p>
            </div>
            <FuelCardsClient />
        </div>
    )
}
