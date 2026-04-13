"use client"

import { useEffect, useState, useRef } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { useRouter } from "next/navigation"
import { Filter } from "lucide-react"

import { Packages } from "@/app/models/packages"
import { getPackages, getPackagesCount } from "@/lib/supabase/supabase-rpc"

import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { STATUS_OPTIONS } from "@/app/models/package-status"
import { TableLayout } from "@/components/table-layout"

export function PackagesTable() {
    const PAGE_SIZE = 20

    const [packages, setPackages] = useState<Packages[]>([])
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<string[]>([])

    const router = useRouter()

    async function loadData() {
        setLoading(true)

        const count = await getPackagesCount(statusFilter)
        const data = await getPackages(PAGE_SIZE, page, statusFilter)

        setTotalPages(Math.ceil(count / PAGE_SIZE))

        const mapped: Packages[] = data.map((p) => ({
            packageId: p.id,
            trackingNumber: p.tracking_number,
            fromAddress: p.from_customer_address,
            toAddress: p.to_customer_address,
            status: p.latest_package_status_text ?? "Pending",
            driverId: p.driver_id ?? "",
            driverName: p.driver_name ?? "",
        }))

        setPackages(mapped)
        setLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [page, statusFilter])


    const columns: ColumnDef<Packages>[] = [
        { accessorKey: "trackingNumber", header: "Tracking Number" },
        { accessorKey: "fromAddress", header: "Pickup" },
        { accessorKey: "toAddress", header: "Drop off" },
        { accessorKey: "driverName", header: "Driver" },
        {
            accessorKey: "status",
            header: () => (
                <div className="flex items-center gap-2">
                    <span>Status</span>

                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Filter packages by status"
                                className={`h-6 w-6 ${statusFilter.length
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                    }`}
                            >
                                <Filter className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="start" className="w-44">
                            { /**
                             * https://github.com/shadcn-ui/ui/issues/9117#issuecomment-3662624798
                             * DropDownMenuLabel needs to be wrapped in DropdownMenuGroup otherwise an exception will be thrown
                             */}
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>Filter Status</DropdownMenuLabel>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />

                            {STATUS_OPTIONS.map((status) => (
                                <DropdownMenuCheckboxItem
                                    key={status}
                                    checked={statusFilter.includes(status)}
                                    onCheckedChange={(checked) => {
                                        const updated = checked
                                            ? [...statusFilter, status]
                                            : statusFilter.filter((s) => s !== status)

                                        setStatusFilter(updated)
                                        setPage(1)
                                    }}
                                >
                                    {status}
                                </DropdownMenuCheckboxItem>
                            ))}

                            <DropdownMenuSeparator />

                            <DropdownMenuCheckboxItem
                                checked={false}
                                onClick={() => {
                                    setStatusFilter([])
                                    setPage(1)
                                }}
                            >
                                Clear
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
            cell: ({ row }) => {
                const status = row.original.status

                const styles =
                    status === "Failed"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                        : status === "Delivered"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                            : "bg-muted text-muted-foreground"

                return (
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles}`}>
                        {status}
                    </span>
                )
            },
        },
    ]

    return (
        <div className="space-y-6 w-full">
            <div className="flex items-center justify-end">
                <Button onClick={() => router.push("/dashboard/packages/add")}>
                    Add Package
                </Button>
            </div>
            <TableLayout
                data={packages}
                columns={columns}
                loading={loading}
                pageSize={PAGE_SIZE}
                actions={(row) => {
                    router.push(`packages/${row.trackingNumber}`)
                }}
                handleDelete={(rows) => {
                    console.log(rows)
                }}
            />

            <div className="flex items-center justify-end space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                >
                    Previous
                </Button>

                <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                </span>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={page === totalPages}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}
