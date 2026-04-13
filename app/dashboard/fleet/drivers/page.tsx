"use client"

import { SetStateAction, useEffect, useState } from "react"
import { DriverDialog } from "./driver-dialog"
import { ListDriverDto } from "@/lib/api";
import { useRouter } from "next/navigation";
import { getDrivers } from "@/lib/supabase/supabase-rpc"
import { DriverTable } from "@/components/driver/driver-table"

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
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Drivers</h1>
                <p className="text-muted-foreground">
                    Manage your drivers and their assignments.
                </p>
            </div>
            <DriverDialog />
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