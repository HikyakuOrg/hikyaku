"use client"

import { getPackages, getPackagesCount } from "@/lib/supabase/supabase-rpc"
import { PackageListTable } from "./package-list-table"

export function PackagesTable() {
    return (
        <PackageListTable
            addPackageHref="/dashboard/packages/add"
            loadPage={async (pageSize, page, statuses) => {
                const [totalCount, data] = await Promise.all([
                    getPackagesCount(statuses),
                    getPackages(pageSize, page, statuses),
                ])

                return {
                    totalCount,
                    data: data.map((item) => ({
                        id: item.id,
                        trackingNumber: item.tracking_number,
                        fromAddress: item.from_customer_address,
                        toAddress: item.to_customer_address,
                        status: item.latest_package_status_text ?? "Pending",
                        driverId: item.driver_id ?? "",
                        driverName: item.driver_name ?? "",
                    })),
                }
            }}
        />
    )
}
