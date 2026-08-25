import { redirect } from 'next/navigation'

import { orgPath } from '@/lib/subdomain'
import { getWarehouseAllowance } from '@/lib/warehouse-allowance'
import { AddWarehouseForm } from './warehouse-form'

interface PageProps {
    params: Promise<{ slug: string }>
}

export default async function AddWarehousePage({ params }: PageProps) {
    const { slug } = await params

    // The list page hides the Add button once a personal account is at its one
    // warehouse; this catches direct navigation and stale tabs, so the form is
    // never rendered where it cannot succeed. The real enforcement is the
    // warehouse_personal_org_limit trigger — this is only about not showing
    // someone a form that will 400 on submit.
    const allowance = await getWarehouseAllowance(slug)
    if (!allowance.orgType) redirect('/orgs')
    if (!allowance.canAdd) redirect(orgPath(slug, '/dashboard/service/warehouse'))

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Add Warehouse</h1>
                <p className="text-muted-foreground">
                    Register a new warehouse for your logistics operations.
                </p>
            </div>

            <AddWarehouseForm />
        </div>
    )
}
