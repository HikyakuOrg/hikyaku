"use client"

import Link from "next/link"
import { notFound } from "next/navigation"
import { use, useEffect, useState } from "react"

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { parseISO, format } from "date-fns";
import {
    Card,
    CardDescription,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getCustomer } from "@/lib/supabase/db"
import { Calendar, Phone, Globe, Hash, Loader2 } from "lucide-react"
import { CustomerPackagesTable } from "./customer-packages-table"

type CustomerDetailPageProps = {
    params: Promise<{ id: string }>
}

function formatRegion(customer: Customer) {
    const stateAndPostcode = [customer.customer_state, customer.customer_postcode]
        .filter(Boolean)
        .join(" ")

    return [customer.customer_suburb, stateAndPostcode].filter(Boolean).join(", ")
}

function formatFullAddress(customer: Customer) {
    return [customer.customer_address, formatRegion(customer), customer.customer_country]
        .filter(Boolean)
        .join(", ")
}

function formatDateTime(input: string) {
    const date = parseISO(input)
    const output = format(date, "d MMMM yyyy")
    return output
}

export default function CustomerDetailPage({ params }: CustomerDetailPageProps) {
    const { id } = use(params)
    const [customer, setCustomer] = useState<Customer | null>(null)
    const [status, setStatus] = useState<"loading" | "ready" | "not-found">("loading")

    useEffect(() => {
        let active = true

        async function loadCustomer() {
            try {
                const nextCustomer = await getCustomer(id)

                if (!active) {
                    return
                }

                setCustomer(nextCustomer as Customer)
                setStatus("ready")
            } catch {
                if (!active) {
                    return
                }

                setStatus("not-found")
            }
        }

        setStatus("loading")
        setCustomer(null)
        void loadCustomer()

        return () => {
            active = false
        }
    }, [id])

    if (status === "not-found") {
        notFound()
    }

    if (status === "loading" || !customer) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        )
    }

    const region = formatRegion(customer)
    return (
        <div className="space-y-6 p-6">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <Link href="/dashboard/customers" className="text-muted-foreground transition-colors hover:text-foreground">
                            Customers
                        </Link>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>{customer.customer_name}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {customer.customer_name}
            </h1>

            <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div className="space-y-6">
                    <div className="space-y-6 p-6">
                        <div className="space-y-1">
                            <p className="text-sm font-medium uppercase">
                                Customer details
                            </p>
                        </div>

                        <div className="space-y-5">
                            <div className="flex items-center gap-4">
                                <div className="flex size-10 items-center justify-center rounded-full border bg-background">
                                    <Calendar className="size-4 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Customer since</p>
                                    <p className="text-sm font-semibold tracking-tight text-foreground">{formatDateTime(customer.created_at)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex size-10 items-center justify-center rounded-full border bg-background">
                                    <Phone className="size-4 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Phone number</p>
                                    <p className="text-sm font-semibold tracking-tight text-foreground">{customer.customer_phone}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex size-10 items-center justify-center rounded-full border bg-background">
                                    <Globe className="size-4 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Country</p>
                                    <p className="text-sm font-semibold tracking-tight text-foreground">{customer.customer_country}</p>
                                </div>
                            </div>


                            <div className="flex items-center gap-4">
                                <div className="flex size-10 items-center justify-center rounded-full border bg-background">
                                    <Hash className="size-4 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Customer ID</p>
                                    <p className="text-sm font-semibold tracking-tight text-foreground">{customer.id}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1 p-6">
                        <p className="text-sm font-medium uppercase">
                            Address
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">{customer.customer_address}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{region}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{customer.customer_country}</p>
                    </div>
                </div>
                <div>
                    <Card>
                        <CardHeader className="space-y-3">
                            <div>
                                <CardTitle>Package activity</CardTitle>
                                <CardDescription>
                                    Browse packages this customer has shipped and received.
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="shipped" className="w-full space-y-6">
                                <TabsList variant="line">
                                    <TabsTrigger value="shipped">Shipped</TabsTrigger>
                                    <TabsTrigger value="received">Received</TabsTrigger>
                                </TabsList>
                                <TabsContent value="shipped">
                                    <CustomerPackagesTable customerId={customer.id} direction="shipped" />
                                </TabsContent>
                                <TabsContent value="received">
                                    <CustomerPackagesTable customerId={customer.id} direction="received" />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}