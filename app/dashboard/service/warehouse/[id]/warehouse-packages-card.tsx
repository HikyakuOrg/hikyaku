"use client"

import { Packages } from "@/app/models/packages"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { getWarehousePackages } from "@/lib/supabase/db"
import { RowSelectionState } from "@tanstack/react-table"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"


export function WarehousePackagesCard({ warehouseId }: { warehouseId: string }) {


    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)
    const [loading, setLoading] = useState(true)
    const itemsPerPage = 20;

    useEffect(() => {
        setLoading(true)
        getWarehousePackages(warehouseId, page, totalPages).then((data) => {
           
            setTotalPages(data.total)
            setLoading(false)
        })
    }, [warehouseId, page])

    return (
        <div></div>
    )
}