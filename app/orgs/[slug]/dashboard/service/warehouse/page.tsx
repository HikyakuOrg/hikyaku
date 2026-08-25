import { getWarehouseLocations, getWarehousesPaginated, WAREHOUSE_PAGE_SIZE } from "@/lib/supabase/db-server";
import { getWarehouseAllowance } from "@/lib/warehouse-allowance";
import { WarehouseExplorer } from "./warehouse-explorer";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PageProps {
    params: Promise<{ slug: string }>
}

export default async function WarehousePage({ params: routeParams }: PageProps) {
    const { slug } = await routeParams

    // All pins (lightweight, for the map) + the first page of cards + whether
    // this org may add another warehouse, in parallel.
    const [pins, firstPage, allowance] = await Promise.all([
        getWarehouseLocations(),
        getWarehousesPaginated(1, WAREHOUSE_PAGE_SIZE),
        getWarehouseAllowance(slug),
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
                {allowance.canAdd ? (
                    // `render` rather than a nested <Link>: the disabled variant
                    // below has to actually be unclickable, and a disabled button
                    // wrapping an anchor still navigates.
                    <Button render={<Link href={`/orgs/${slug}/dashboard/service/warehouse/add`} />}>
                        Add Warehouse
                    </Button>
                ) : (
                    <div className="flex flex-col items-end gap-1">
                        <Button disabled>Add Warehouse</Button>
                        <p className="text-xs text-muted-foreground">
                            Personal accounts are limited to one warehouse.
                        </p>
                    </div>
                )}
            </div>

            <WarehouseExplorer
                initialPins={pins}
                initialItems={initialItems}
                initialTotal={firstPage.total}
            />
        </div>
    );
}
