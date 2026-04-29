"use client"

import { useEffect, useRef, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { useRouter } from "next/navigation"
import { Filter } from "lucide-react"

import { STATUS_OPTIONS } from "@/app/models/package-status"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type PackageListItem = {
    id: string
    trackingNumber: string
    fromAddress: string
    toAddress: string
    status: string
    driverId: string
    driverName: string
}

type PackageListTableProps = {
    loadPage: (pageSize: number, page: number, statuses: string[]) => Promise<{
        data: PackageListItem[]
        totalCount: number
    }>
    addPackageHref?: string
    addPackageLabel?: string
    pageSize?: number
}

export function PackageListTable({
    loadPage,
    addPackageHref,
    addPackageLabel = "Add Package",
    pageSize = 20,
}: PackageListTableProps) {
    const [packages, setPackages] = useState<PackageListItem[]>([])
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<string[]>([])

    const router = useRouter()
    const loadPageRef = useRef(loadPage)

    loadPageRef.current = loadPage

    useEffect(() => {
        let active = true

        async function loadData() {
            setLoading(true)

            try {
                const result = await loadPageRef.current(pageSize, page, statusFilter)

                if (!active) {
                    return
                }

                setPackages(result.data)
                setTotalPages(Math.max(1, Math.ceil(result.totalCount / pageSize)))
            } catch (error) {
                console.error("Failed to load package list", error)

                if (!active) {
                    return
                }

                setPackages([])
                setTotalPages(1)
            } finally {
                if (active) {
                    setLoading(false)
                }
            }
        }

        void loadData()

        return () => {
            active = false
        }
    }, [page, pageSize, statusFilter])

    const columns: ColumnDef<PackageListItem>[] = [
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
                                className={`h-6 w-6 ${statusFilter.length ? "text-primary" : "text-muted-foreground"}`}
                            >
                                <Filter className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="start" className="w-44">
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
                                            : statusFilter.filter((item) => item !== status)

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
            {addPackageHref ? (
                <div className="flex items-center justify-end">
                    <Button onClick={() => router.push(addPackageHref)}>
                        {addPackageLabel}
                    </Button>
                </div>
            ) : null}

            <DataTable
                data={packages}
                columns={columns}
                loading={loading}
                pageSize={pageSize}
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                actions={(row) => {
                    router.push(`/dashboard/packages/${row.trackingNumber}`)
                }}
            />
        </div>
    )
}