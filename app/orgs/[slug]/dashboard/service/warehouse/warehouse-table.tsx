"use client"

import { useTransition, useState } from "react"
import { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { useRouter, useSearchParams } from "next/navigation"
import { useOrgSlug } from "@/lib/use-org"

import { Tables } from "@/lib/supabase/supabase"
import { TableLayout } from "@/components/table-layout"
import { Button } from "@/components/ui/button"

interface WarehouseTableProps {
    initialData: Tables<'warehouse'>[];
    initialPage: number;
    initialTotalPages: number;
}

export function WarehouseTable({
    initialData,
    initialPage,
    initialTotalPages
}: WarehouseTableProps) {
    const PAGE_SIZE = 20
    const router = useRouter()
    const searchParams = useSearchParams()
    const slug = useOrgSlug()
    const [isPending, startTransition] = useTransition()
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

    function updateParams(updates: Record<string, string | null>) {
        const params = new URLSearchParams(searchParams.toString())
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null) {
                params.delete(key)
            } else {
                params.set(key, value)
            }
        })

        startTransition(() => {
            router.push(`/orgs/${slug}/dashboard/service/warehouse?${params.toString()}`)
        })
    }

    const columns: ColumnDef<Tables<'warehouse'>>[] = [
        { accessorKey: "warehouse_name", header: "Name" },
        { accessorKey: "warehouse_address", header: "Address" },
        { accessorKey: "warehouse_city", header: "City" },
        { accessorKey: "warehouse_state", header: "State" },
        { accessorKey: "warehouse_zipcode", header: "Zip Code" },
        { accessorKey: "warehouse_country", header: "Country" },
    ]

    return (
        <div className="space-y-6 w-full">
            <TableLayout
                data={initialData}
                columns={columns}
                loading={isPending}
                pageSize={PAGE_SIZE}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                actions={(row) => {
                    router.push(`/orgs/${slug}/dashboard/service/warehouse/${row.id}`)
                }}
            />

            <div className="flex items-center justify-end space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateParams({ page: Math.max(1, initialPage - 1).toString() })}
                    disabled={initialPage === 1 || isPending}
                >
                    Previous
                </Button>

                <span className="text-sm text-muted-foreground">
                    Page {initialPage} of {initialTotalPages}
                </span>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        updateParams({ page: Math.min(initialTotalPages, initialPage + 1).toString() })
                    }
                    disabled={initialPage === initialTotalPages || isPending}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}
