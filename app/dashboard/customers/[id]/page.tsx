import { notFound } from "next/navigation"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { getCustomer } from "@/lib/supabase/db-server"

type CustomerDetailPageProps = {
    params: Promise<{ id: string }>
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
    const { id } = await params

    try {
        const customer = await getCustomer(id)

        return (
            <div className="space-y-6 p-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {customer.customer_name}
                    </h1>
                    <p className="text-muted-foreground">
                        Customer contact and address details.
                    </p>
                </div>

                <div className="max-w-3xl">
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer Details</CardTitle>
                            <CardDescription>
                                Record used across packages, delivery routing, and contact workflows.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Phone Number</p>
                                <p className="font-medium">{customer.customer_phone}</p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Country</p>
                                <p className="font-medium">{customer.customer_country}</p>
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <p className="text-sm text-muted-foreground">Address</p>
                                <p className="font-medium">{customer.customer_address}</p>
                                <p className="text-muted-foreground">
                                    {customer.customer_suburb}, {customer.customer_state} {customer.customer_postcode}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    } catch {
        notFound()
    }
}