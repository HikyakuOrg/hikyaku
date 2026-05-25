import { getWarehouseLocations, getWarehousesPaginated, WAREHOUSE_PAGE_SIZE } from "@/lib/supabase/db-server";
import { WarehouseExplorer } from "./warehouse-explorer";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PageProps {
    params: Promise<{ slug: string }>
}

export default async function WarehousePage({ params: routeParams }: PageProps) {
    const { slug } = await routeParams

    // All pins (lightweight, for the map) + the first page of cards, in parallel.
    const [pins, firstPage] = await Promise.all([
        getWarehouseLocations(),
        getWarehousesPaginated(1, WAREHOUSE_PAGE_SIZE),
    ]);

    const initialItems = firstPage.data.map((warehouse) => ({
        id: warehouse.id,
        warehouse_name: warehouse.warehouse_name,
        warehouse_address: warehouse.warehouse_address,
    }));

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Warehouses</h1>
                    <p className="text-muted-foreground">
                        Manage your warehouses.
                    </p>
                </div>
                <Button>
                    <Link href={`/orgs/${slug}/dashboard/service/warehouse/add`}>
                        Add Warehouse
                    </Link>
                </Button>
            </div>

            <WarehouseExplorer
                initialPins={pins}
                initialItems={initialItems}
                initialTotal={firstPage.total}
            />
        </div>
    );
}
