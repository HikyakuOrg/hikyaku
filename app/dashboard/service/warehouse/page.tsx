import { getWarehousesPaginated } from "@/lib/supabase/db-server";
import { WarehouseTable } from "./warehouse-table";

interface PageProps {
    searchParams: Promise<{
        page?: string;
    }>;
}

export default async function WarehousePage({ searchParams }: PageProps) {
    const params = await searchParams;
    const currentPage = Number(params.page) || 1;
    const PAGE_SIZE = 20;

    const { data: warehouse, total: totalWarehouses } = await getWarehousesPaginated(
        currentPage,
        PAGE_SIZE
    );

    const totalPages = Math.ceil(totalWarehouses / PAGE_SIZE);

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Warehouses</h1>
                <p className="text-muted-foreground">
                    Manage your warehouses.
                </p>
            </div>

            <WarehouseTable
                initialData={warehouse}
                initialPage={currentPage}
                initialTotalPages={totalPages}
            />
        </div>
    );
}