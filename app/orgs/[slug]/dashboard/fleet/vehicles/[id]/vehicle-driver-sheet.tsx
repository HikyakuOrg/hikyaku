'use client'

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
import { useState } from "react"
import { getDrivers } from "@/lib/supabase/supabase-rpc"
import { RowSelectionState } from "@tanstack/react-table"
import { assignVehicleToDriver } from "@/lib/supabase/db"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"

interface VehicleDriverSheetProps {
    vehicleId: string
    onDriverAssigned: () => void
}

export function VehicleDriverSheet({ vehicleId, onDriverAssigned }: VehicleDriverSheetProps) {
    const [open, setOpen] = useState(false)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(false)
    const [drivers, setDrivers] = useState<ListDriverDto[]>([])
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const PAGE_SIZE = 8

    const fetchDrivers = async (p: number) => {
        setLoading(true)
        try {
            const data = await getDrivers(p, PAGE_SIZE)
            setDrivers(data)
            if (data.length > 0) {
                setTotalPages(Math.max(1, Math.ceil((data[0].total ?? 0) / PAGE_SIZE)))
            }
        } finally {
            setLoading(false)
        }
    }

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen)
        if (isOpen) {
            setPage(1)
            setRowSelection({})
            fetchDrivers(1)
        }
    }

    const handlePageChange = (p: number) => {
        setPage(p)
        fetchDrivers(p)
    }

    const handleAssign = async () => {
        const selectedIds = Object.keys(rowSelection)
        if (selectedIds.length === 0) return
        try {
            await assignVehicleToDriver(vehicleId, selectedIds[0])
            setOpen(false)
            onDriverAssigned()
            toast.success("Driver assigned successfully", { position: "bottom-right" })
        } catch (error) {
            toast.error(getErrorMessage(error) || "Failed to assign driver")
        }
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button size="sm" variant="outline">Assign Now</Button>
            </SheetTrigger>
            <SheetContent className="w-screen flex flex-col h-screen">
                <SheetHeader>
                    <SheetTitle>Assign Driver</SheetTitle>
                    <SheetDescription>Select a driver to assign to this vehicle.</SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    <DriverTable
                        data={drivers}
                        loading={loading}
                        pageSize={PAGE_SIZE}
                        page={page}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        actions={(row) => {
                            const isSelected = !!rowSelection[row.id]
                            setRowSelection(prev => {
                                if (isSelected) {
                                    const { [row.id]: _, ...rest } = prev
                                    return rest
                                } else {
                                    return { [row.id]: true }
                                }
                            })
                        }}
                        rowSelection={rowSelection}
                        onRowSelectionChange={setRowSelection}
                    />
                </div>

                <SheetFooter className="sticky bottom-0 z-10 border-t bg-background px-6 py-4">
                    <Button
                        onClick={handleAssign}
                        disabled={Object.keys(rowSelection).length === 0}
                    >
                        Assign Selected
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
