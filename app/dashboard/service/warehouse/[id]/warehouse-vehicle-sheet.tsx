import { FleetTable } from "@/app/dashboard/fleet/vehicles/fleet-table";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getVehiclesNotAssigned, updateVehiclesWarehouse, VehiclesWithTypes } from "@/lib/supabase/db";
import { Tables } from "@/lib/supabase/supabase";
import { RowSelectionState } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface WarehouseVehicleSheetProp {
    warehouseId: string
    onVehicleAdded: (vehicleIds: string[]) => void
    vehicleTypes: Tables<"vehicle_type">[]
}



export function WarehouseVehicleSheet({ warehouseId, onVehicleAdded, vehicleTypes }: WarehouseVehicleSheetProp) {

    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(true)
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [vehicles, setVehicles] = useState<VehiclesWithTypes[]>([])
    const [currentPage, setCurrentPage] = useState(1);
    
    const PAGE_SIZE = 8


    useEffect(() => {
        setLoading(true)
        const fetchVehicles = async () => {
            const vehicles = await getVehiclesNotAssigned(currentPage, PAGE_SIZE)
            setVehicles(vehicles.data)
            setTotalPages(Math.ceil(vehicles.total / PAGE_SIZE))
            setLoading(false)
        }
        fetchVehicles()
    }, [currentPage])

    return (
        <Sheet>
            <SheetTrigger>
                <Button>
                    Attach Vehicle
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Assign Vehicle</SheetTitle>
                    <SheetDescription>
                        Assign a vehicle to this warehouse.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto py-4">
                    <FleetTable
                        vehicles={vehicles}
                        vehicleTypes={vehicleTypes}
                        loading={loading}
                        pageSize={PAGE_SIZE}
                        onPageChange={setCurrentPage}
                        rowSelection={rowSelection}
                        onRowSelectionChange={setRowSelection}
                        actions={(row) => {
                            setRowSelection(prev => ({
                                ...prev,
                                [row.id]: !prev[row.id],
                            }))
                        }}
                    />

                    <div className="flex items-center justify-end space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>

                        <span className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </span>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setCurrentPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={currentPage === totalPages}>
                            Next
                        </Button>
                    </div>
                </div>

                <SheetFooter className="sticky bottom-0 z-10 border-t bg-background px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <SheetClose>
                                <Button onClick={() => {
                                    const selectedIds = Object.keys(rowSelection)
                                    updateVehiclesWarehouse(selectedIds, warehouseId)
                                    setRowSelection({})
                                    setVehicles(prev => prev.filter(v => !selectedIds.includes(v.id)))
                                    toast.success("Vehicles added successfully", { position: "bottom-right" })
                                    onVehicleAdded(selectedIds)
                                }}>
                                    Add Selected
                                </Button>
                            </SheetClose>

                        </div>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}