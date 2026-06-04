'use client'

import { VehiclesWithTypes } from '@/lib/supabase/db';
import { useOrgSlug } from '@/lib/use-org';
import { VehicleCard } from './components/vehicle-card';

interface FleetInventoryProps {
    vehicles: VehiclesWithTypes[];
}

export function FleetGrid({ vehicles }: FleetInventoryProps) {
    const slug = useOrgSlug();

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {vehicles.map((v) => (
                <VehicleCard
                    key={v.id}
                    vehicle={v}
                    href={`/orgs/${slug}/dashboard/fleet/vehicles/${v.id}`}
                />
            ))}
        </div>
    )
}
