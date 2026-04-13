import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { DriverTable } from "@/components/driver/driver-table"
import { ListDriverDto } from "@/lib/api"
import { useEffect, useState } from "react"
import { getUnassignedDrivers } from "@/lib/supabase/supabase-rpc"
import { RowSelectionState } from "@tanstack/react-table"
import { updateDriversWarehouse } from "@/lib/supabase/db"
import { toast } from "sonner"

interface WarehouseDriverSheetProp {
    warehouseId: string
    onDriverAdded: (driverIds: string[]) => void
}

export function WarehouseDriverSheet({ warehouseId, onDriverAdded }: WarehouseDriverSheetProp) {

    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(true)
    const [drivers, setDrivers] = useState<ListDriverDto[]>([])
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const PAGE_SIZE = 8

    useEffect(() => {
        if (!open) return

        const fetchDrivers = async () => {
            setLoading(true)

            const drivers = await getUnassignedDrivers(page, PAGE_SIZE)
            setDrivers(drivers)

            if (drivers.length > 0) {
                setTotalPages(drivers[0].total_pages)
            }

            setLoading(false)
        }

        fetchDrivers()
    }, [page])


    return (
        <Sheet>
            <SheetTrigger>
                <Button>
                    Attach Driver
                </Button>
            </SheetTrigger>
            <SheetContent className="w-screen flex flex-col h-screen">
                <SheetHeader>
                    <SheetTitle>Assign Driver</SheetTitle>
                    <SheetDescription>
                        Assign a driver to this warehouse.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    <DriverTable
                        data={drivers}
                        loading={loading}
                        pageSize={PAGE_SIZE}
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        actions={(row) => {
                            const isSelected = !!rowSelection[row.id]
                            setRowSelection(prev => {
                                if (isSelected) {
                                    const { [row.id]: _, ...rest } = prev
                                    return rest
                                } else {
                                    return { ...prev, [row.id]: true }
                                }
                            })
                        }}
                        rowSelection={rowSelection}
                        onRowSelectionChange={setRowSelection}
                    />
                </div>

                <SheetFooter className="sticky bottom-0 z-10 border-t bg-background px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <SheetClose>
                                <Button onClick={() => {
                                    const selectedIds = Object.keys(rowSelection)
                                    updateDriversWarehouse(selectedIds, warehouseId)
                                    setRowSelection({})
                                    setDrivers(prev => prev.filter(d => !selectedIds.includes(d.id)))
                                    onDriverAdded(selectedIds)
                                    toast.success("Drivers added successfully", { position: "bottom-right" })
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