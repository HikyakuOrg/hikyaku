"use client"

import { getPackages, getPackagesCount } from "@/lib/supabase/supabase-rpc"
import { PackageListTable } from "./package-list-table"
import { useOrgSlug } from "@/lib/use-org"
import { useOrganisationId } from "@/components/organisation-provider"

export function PackagesTable() {
    const slug = useOrgSlug()
    const organisationId = useOrganisationId()
    return (
        <PackageListTable
            addPackageHref={`/orgs/${slug}/dashboard/packages/add`}
            showCoverageFilter
            loadPage={async (pageSize, page, statuses, coverageOutcomes) => {
                const [totalCount, data] = await Promise.all([
                    getPackagesCount(organisationId, statuses, undefined, coverageOutcomes),
                    getPackages(organisationId, pageSize, page, statuses, undefined, coverageOutcomes),
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
                        coverageOutcome: item.coverage_outcome,
                    })),
                }
            }}
        />
    )
}
