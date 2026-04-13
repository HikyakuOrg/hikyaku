import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import { assignVehicleToDriver, deleteDriverAssignedVehicle, getVehiclesById, getVehiclesNotAssignedInWarehouse } from "@/lib/supabase/db"
import { ColumnDef } from "@tanstack/react-table"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"


interface WarehouseVehicleDialog {
    warehouseId: string
    assignedVehicleId: string | null
    driverId: string
    isDialogOpen: boolean
    setIsDialogOpen: (value: boolean) => void
}

interface VehicleNotAssigned {
    id: string;
    vehicle_plate: string | null;
    vehicle_identification_number: string | null;
    vehicle_make: string | null;
    vehicle_year: number;
    vehicle_model: string | null;
    vehicle_gross_limits: number;
    warehouse_id: string | null;
    vehicle_type: {
        id: string;
        vehicle_type: string;
        vehicle_description: string | null;
    };
    driver_vehicle_assignment?: {
        id: string;
    }[];
}

export function WarehouseVehiclesDialog({ warehouseId, driverId, assignedVehicleId, isDialogOpen, setIsDialogOpen }: WarehouseVehicleDialog) {

    const [vehicles, setVehicles] = useState<VehicleNotAssigned[]>([])
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1);
    const router = useRouter()

    const PAGE_SIZE = 10

    useEffect(() => {
        if (!warehouseId) return

        getVehiclesNotAssignedInWarehouse(warehouseId, currentPage, PAGE_SIZE).then(value => {
            setVehicles(value.data)
            if (assignedVehicleId) {
                getVehiclesById([assignedVehicleId]).then(value => {
                    setVehicles((prev) => {
                        const merged = [...prev, ...value]
                        const unique = merged.filter(
                            (vehicle, index, self) =>
                                index === self.findIndex(v => v.id === vehicle.id)
                        )
                        return unique
                    })
                })
            }
            setTotalPages(Math.max(1, Math.ceil(value.total / PAGE_SIZE)))
            setLoading(false)
        })
    }, [currentPage, assignedVehicleId, warehouseId])

    const columns: ColumnDef<VehicleNotAssigned>[] = [
        {
            accessorKey: "vehicle_plate",
            header: "Vehicle Plate",
        },
        {
            accessorKey: "vehicle_model",
            header: "Vehicle Model",
        },
        {
            accessorFn: (row) => row.vehicle_type?.vehicle_type ?? "-",
            header: "Vehicle Type",
        },
        {
            // Make sure there are blank space here otherwise it will not work
            header: "  ",
            cell: ({row}) => {
                if(row.original.id === assignedVehicleId){
                    return (
                        <Button variant="destructive" onClick={() => deleteAssignedVehicle(row.original.id)}>
                            Unassign
                        </Button>
                    )
                } else {
                    return (
                        <Button variant="outline" onClick={() => handleAssignVehicle(row.original.id)}>
                            Assign
                        </Button>
                    )
                }

            }
        }
    ]

    const deleteAssignedVehicle = async (vehicleId: string) => {
        try {
            await deleteDriverAssignedVehicle(vehicleId, driverId)
            setIsDialogOpen(false)
            router.refresh()
        } catch (error: any) {
            toast.error(error.message, { position: "bottom-right" })
        }
    }

    const handleAssignVehicle = async (vehicleId: string) => {
        try {
            await assignVehicleToDriver(vehicleId, driverId)
            setIsDialogOpen(false)
            router.refresh()
        } catch (error: any) {
            toast.error(error.message, { position: "bottom-right" })
        }
    }



    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign Vehicle To Driver</DialogTitle>
                    <DialogDescription>
                        Select an available vehicle to assign to this driver.
                    </DialogDescription>
                </DialogHeader>
                <DataTable
                    data={vehicles}
                    columns={columns}
                    loading={loading}
                    pageSize={PAGE_SIZE}
                    page={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => {
                        setCurrentPage(page)
                    }}
                    actions={() => {

                    }}
                />
            </DialogContent>
        </Dialog>

    )
}