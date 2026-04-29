"use client"

import {
    getCustomerPackages,
    getCustomerPackagesCount,
} from "@/lib/supabase/supabase-rpc"

import { PackageListTable } from "@/app/dashboard/packages/package-list-table"

type CustomerPackagesTableProps = {
    customerId: string
    direction: "shipped" | "received"
}

export function CustomerPackagesTable({ customerId, direction }: CustomerPackagesTableProps) {
    return (
        <PackageListTable
            loadPage={async (pageSize, page, statuses) => {
                const [totalCount, data] = await Promise.all([
                    getCustomerPackagesCount(customerId, direction, statuses),
                    getCustomerPackages(customerId, direction, pageSize, page, statuses),
                ])

                return {
                    totalCount,
                    data: data.map((item) => ({
                        id: item.id,
                        trackingNumber: item.tracking_number,
                        fromAddress: item.from_customer_address,
                        toAddress: item.to_customer_address,
                        status: item.latest_package_status_text,
                        driverId: item.driver_id,
                        driverName: item.driver_name,
                    })),
                }
            }}
        />
    )
}