"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { useRouter, useSearchParams } from "next/navigation"
import { useOrgSlug } from "@/lib/use-org"

interface CustomerTableProps {
    data: Customer[]
    total: number
    page: number
    pageSize: number
}

export function CustomerTable({ data, total, page, pageSize }: CustomerTableProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const slug = useOrgSlug()

    const columns: ColumnDef<Customer>[] = [
        {
            accessorKey: "customer_name",
            header: "Name",
            cell: ({ row }) => <span className="font-medium">{row.original.customer_name}</span>
        },
        {
            accessorKey: "customer_address",
            header: "Address",
            cell: ({ row }) => {
                const c = row.original
                return `${c.customer_address}, ${c.customer_suburb}, ${c.customer_state} ${c.customer_postcode}`
            }
        },
        {
            accessorKey: "customer_phone",
            header: "Phone Number",
        },
    ]

    const totalPages = Math.ceil(total / pageSize)

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("page", newPage.toString())
        router.push(`/orgs/${slug}/dashboard/customers?${params.toString()}`)
    }

    return (
        <DataTable
            data={data}
            columns={columns}
            loading={false}
            pageSize={pageSize}
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            actions={(row) => {
                router.push(`/orgs/${slug}/dashboard/customers/${row.id}`)
            }}
        />
    )
}
