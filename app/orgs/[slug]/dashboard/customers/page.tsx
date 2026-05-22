import { getCustomers } from "@/lib/supabase/db-server"
import { CustomerTable } from "./customer-table"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const PAGE_SIZE = 10

export default async function CustomersPage({
    params: routeParams,
    searchParams,
}: {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ page?: string }>
}) {
    const { slug } = await routeParams
    const params = await searchParams
    const page = Number(params.page) || 1
    const { data, total } = await getCustomers(page, PAGE_SIZE)

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Customers</h1>
                    <p className="text-muted-foreground">
                        Manage customer information.
                    </p>
                </div>
                <Button>
                    <Link href={`/orgs/${slug}/dashboard/customers/add`}>
                        Add Customer
                    </Link>
                </Button>
            </div>

            <CustomerTable
                data={data}
                total={total}
                page={page}
                pageSize={PAGE_SIZE}
            />
        </div>
    )
}
