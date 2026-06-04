"use client"

import { DriverTable } from "@/components/driver/driver-table"
import {
    Card,
    CardContent,
    CardHeader,
} from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { ListDriverDto } from "@/lib/api"
import { useEffect, useState } from "react"
import { WarehouseDriverSheet } from "./warehouse-driver-sheet"
import { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { getDriversByIds, getDriversByWarehouse } from "@/lib/supabase/supabase-rpc"
import { removeDriversWarehouse } from "@/lib/supabase/db"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"
import { WarehouseVehiclesDialog } from "./warehouse-vehicles-dialog"
import { Button } from "@/components/ui/button"



export function WarehouseDriverCard({ warehouseId }: { warehouseId: string }) {

    const [drivers, setDrivers] = useState<ListDriverDto[]>([])
    const [loading, setLoading] = useState(false)
    const [rowVehicleId, setRowVehicleId] = useState("")
    const [rowDriverId, setRowDriverId] = useState("")
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [updatedDriverId, setUpdatedDriverId] = useState<string[]>([])
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const router = useRouter()
    const PAGE_SIZE = 20

    useEffect(() => {
        if (!warehouseId) return
        const fetchDrivers = async () => {
            if (!isDialogOpen){
                setLoading(true)

                const drivers = await getDriversByWarehouse(warehouseId, page, PAGE_SIZE)
                setDrivers(drivers)
                if (drivers.length > 0) {
                    setTotalPages(drivers[0].total_pages)
                }


            }
            setLoading(false)
        }

        fetchDrivers()

    }, [warehouseId, isDialogOpen])

    const columns: ColumnDef<ListDriverDto>[] = [
        {
            header: "Vehicle",
            cell: ({ row }) => {
                const vehicleModel = row.original.vehicle_model || '';
                const vehiclePlate = row.original.vehicle_plate || '';
                return (
                    <div className="flex flex-col">
                        <p className="font-bold">{vehicleModel}</p>
                        <span className="text-sm text-gray-500">{vehiclePlate}</span>
                    </div>
                );             
            }
        }
    ]


    useEffect(() => {
        if(updatedDriverId.length <  0){
            return
        }
        const fetchDrivers = async () => {
            const drivers = await getDriversByIds(updatedDriverId)
            setDrivers(prevDrivers => [...prevDrivers, ...drivers])
        }
        fetchDrivers()
    }, [updatedDriverId])


    async function handleDelete(driverIds: string[]){
        try {
            await removeDriversWarehouse(driverIds)
            // Update UI after successful deletion
            setDrivers(prevDrivers => prevDrivers.filter(driver => !driverIds.includes(driver.id)))
            router.refresh()
        } catch (error) {
            toast.error(getErrorMessage(error), { position: "bottom-right" })
        }
    }

    return (
        <Card>
            <WarehouseVehiclesDialog
                warehouseId={warehouseId}
                driverId={rowDriverId}
                assignedVehicleId={rowVehicleId}
                isDialogOpen={isDialogOpen}
                setIsDialogOpen={setIsDialogOpen}
            />
            <CardHeader>
                <div className="flex items-center justify-end">
                    <WarehouseDriverSheet 
                        warehouseId={warehouseId}
                        onDriverAdded={(driverIds) => {
                            // Race conditions will happen IF another user is also updating the same warehouse's drivers
                            // But for now this is fine. This is an extreme edge case.
                            // An alternative would be to call the DB again but that would incur a network cost
                            setUpdatedDriverId(driverIds)
                            router.refresh() 
                        }} />
                </div>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
                <DriverTable
                    data={drivers}
                    loading={loading}
                    pageSize={PAGE_SIZE}
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    additionalColumns={columns}
                    actions={(row) => {
                        setIsDialogOpen(true)
                        setRowVehicleId(row.vehicle_id ?? "")
                        setRowDriverId(row.id)
                    }}
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    handleDelete={(drivers) => {
                        const driverId = drivers.map(driver => driver.id)
                        handleDelete(driverId)
                    }}
                />
            </CardContent>
        </Card>
    )

}