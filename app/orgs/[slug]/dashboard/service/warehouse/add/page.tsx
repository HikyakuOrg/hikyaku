import { redirect } from 'next/navigation'

import { orgPath } from '@/lib/subdomain'
import { getWarehouseAllowance } from '@/lib/warehouse-allowance'
import { AddWarehouseForm } from './warehouse-form'

interface PageProps {
    params: Promise<{ slug: string }>
}

export default async function AddWarehousePage({ params }: PageProps) {
    const { slug } = await params

    // Also catches direct links and old tabs. A DB trigger enforces the limit.
    const allowance = await getWarehouseAllowance(slug)
    if (!allowance.orgType) redirect('/orgs')
    if (!allowance.canAdd) redirect(orgPath(slug, '/dashboard/service/warehouse'))

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Add Warehouse</h1>
                <p className="text-muted-foreground">
                    Enter the name and address of the warehouse.
                </p>
            </div>

            <AddWarehouseForm />
        </div>
    )
}
