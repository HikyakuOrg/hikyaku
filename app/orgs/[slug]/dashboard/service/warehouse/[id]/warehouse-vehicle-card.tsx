"use client"

import { FleetTable } from "@/app/orgs/[slug]/dashboard/fleet/vehicles/fleet-table"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { VehiclesWithTypes, getVehiclesInWarehouse, getVehicleTypes, getVehiclesById, removeVehiclesWarehouse } from "@/lib/supabase/db"
import { Tables } from "@/lib/supabase/supabase"
import { RowSelectionState } from "@tanstack/react-table"
import { useState, useEffect } from "react"
import { WarehouseVehicleSheet } from "./warehouse-vehicle-sheet"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"


export function WarehouseVehicleCard({ warehouseId }: { warehouseId: string }) {

    const [vehicles, setVehicles] = useState<VehiclesWithTypes[]>([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1);
    const [vehicleTypes, setVehicleTypes] = useState<Tables<'vehicle_type'>[]>([])
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const itemsPerPage = 20;
    const router = useRouter()

    useEffect(() => {
        let cancelled = false
        getVehiclesInWarehouse(warehouseId, currentPage, itemsPerPage).then((data) => {
            if (cancelled) return
            setVehicles(data.data)
            setLoading(false)
        })
        return () => {
            cancelled = true
        }
    }, [warehouseId, currentPage])

    useEffect(() => {
        getVehicleTypes().then(setVehicleTypes)
    }, [])


    async function handleDelete(){
        try {
            const selectedIds = Object.keys(rowSelection)
            await removeVehiclesWarehouse(selectedIds)
            setVehicles(prev => prev.filter(v => !selectedIds.includes(v.id)))
            router.refresh()
        } catch(error){
            toast.error(getErrorMessage(error), { position: "bottom-right" })
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-end">
                    <WarehouseVehicleSheet 
                        warehouseId={warehouseId} 
                        onVehicleAdded={(vehicleIds) => {
                            // Race conditions will happen IF another user is also updating the same warehouse's vehicles
                            // But for now this is fine. This is an extreme edge case.
                            // An alternative would be to call the DB again but that would incur a network cost
                            getVehiclesById(vehicleIds).then((data) => {
                                setVehicles((prev) => [...prev, ...data])
                                // Refresh to show count in warehouse-overview updated in real time
                                router.refresh() 
                            })
                        }} 
                        vehicleTypes={vehicleTypes} />
                </div>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
                <FleetTable
                    vehicles={vehicles}
                    vehicleTypes={vehicleTypes}
                    loading={loading}
                    pageSize={itemsPerPage}
                    onPageChange={(page) => {
                        setLoading(true)
                        setCurrentPage(page)
                    }}
                    handleDelete={async (row) => {
                        handleDelete()
                    }}
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    actions={(row) => {
                        setRowSelection(prev => ({
                            ...prev,
                            [row.id]: !prev[row.id],
                        }))
                    }}
                    />
            </CardContent>
        </Card>
    );
}