"use server"

import {
    getWarehousesPaginated,
    WAREHOUSE_PAGE_SIZE,
    type WarehouseCardData,
} from "@/lib/supabase/db-server"

// Client-side "load more" for the warehouse list. Returns one page of card
// data plus the running total so the client can decide when to stop. Org
// scoping is enforced by RLS inside getWarehousesPaginated (no org param).
export async function fetchWarehousePage(
    page: number
): Promise<{ data: WarehouseCardData[]; total: number }> {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
    const { data, total } = await getWarehousesPaginated(safePage, WAREHOUSE_PAGE_SIZE)

    return {
        data: data.map((w) => ({
            id: w.id,
            warehouse_name: w.warehouse_name,
            warehouse_address: w.warehouse_address,
        })),
        total,
    }
}
