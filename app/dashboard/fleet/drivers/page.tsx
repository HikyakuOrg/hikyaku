"use client"

import { useEffect, useState } from "react"
import { ListDriverDto } from "@/lib/api";
import { useRouter } from "next/navigation";
import { getDrivers } from "@/lib/supabase/supabase-rpc"
import { DriverTable } from "@/components/driver/driver-table"
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 10

export default function DriversPage() {

    const [data, setData] = useState<ListDriverDto[]>([])
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        fetchPage(page)
    }, [page])

    async function fetchPage(page: number) {
        setLoading(true)
        const driversResponse = await getDrivers(page, PAGE_SIZE);
        if (driversResponse.length > 0) {
            setData(driversResponse);
            setTotalPages(driversResponse[0].total_pages);
        }
        setLoading(false)
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Drivers</h1>
                    <p className="text-muted-foreground">Manage your drivers and their assignments.</p>
                </div>
                <Button
                    onClick={() => router.push("/dashboard/fleet/drivers/add")}
                >
                    Add Driver
                </Button>
            </div>
            <DriverTable
                data={data}
                loading={loading}
                pageSize={PAGE_SIZE}
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                actions={(row) => {
                    router.push(`drivers/${row.id}`);
                }}
                handleDelete={(rows) => {
                    console.log(rows);
                }}
            />
        </div>
    );
}