"use client"

import { useRef, useState } from "react"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { toast } from "sonner"

import { DriverTable } from "@/components/driver/driver-table"
import { useOrganisationId } from "@/components/organisation-provider"
import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { SERVICE_AREAS_EDIT, describeWriteError, permissionRequiredMessage } from "@/lib/permissions"
import {
    attachDriversToServiceArea,
    getAttachableDriversForServiceArea,
    type ServiceAreaDriver,
} from "@/lib/supabase/db"

const PAGE_SIZE = 8

type ServiceAreaDriverSheetProps = {
    serviceAreaId: string
    serviceAreaName: string
    /** Whether the user has `service_areas.edit`. For the UI only; RLS enforces it. */
    canEdit: boolean
    /** The rows that were attached, so the list behind the sheet can show them. */
    onAttached: (drivers: ServiceAreaDriver[]) => void
}

export function ServiceAreaDriverSheet({
    serviceAreaId,
    serviceAreaName,
    canEdit,
    onAttached,
}: ServiceAreaDriverSheetProps) {
    const organisationId = useOrganisationId()
    const [open, setOpen] = useState(false)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [drivers, setDrivers] = useState<ServiceAreaDriver[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [isAttaching, setIsAttaching] = useState(false)

    // Selection stays across pages, so keep every loaded row. The list behind
    // the sheet needs all of them after attaching.
    const loadedDriversRef = useRef(new Map<string, ServiceAreaDriver>())

    const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])

    const fetchDrivers = async (nextPage: number) => {
        setIsLoading(true)
        setHasError(false)

        try {
            const result = await getAttachableDriversForServiceArea(organisationId, serviceAreaId, nextPage, PAGE_SIZE)

            for (const driver of result.drivers) {
                loadedDriversRef.current.set(driver.id, driver)
            }

            setDrivers(result.drivers)
            setTotalPages(result.totalPages)
        } catch (error) {
            console.error(error)
            setDrivers([])
            setHasError(true)
        } finally {
            setIsLoading(false)
        }
    }

    const handleOpenChange = (isOpen: boolean) => {
        if (isAttaching) {
            return
        }

        setOpen(isOpen)

        if (isOpen) {
            // Reload on every open, so attached drivers are not listed.
            setPage(1)
            setRowSelection({})
            loadedDriversRef.current.clear()
            void fetchDrivers(1)
        }
    }

    const handlePageChange = (nextPage: number) => {
        setPage(nextPage)
        void fetchDrivers(nextPage)
    }

    const handleAttach = async () => {
        if (selectedIds.length === 0) {
            return
        }

        setIsAttaching(true)

        try {
            // Update the list only after the write succeeds.
            await attachDriversToServiceArea(serviceAreaId, selectedIds)

            const attachedDrivers = selectedIds
                .map((id) => loadedDriversRef.current.get(id))
                .filter((driver): driver is ServiceAreaDriver => driver !== undefined)

            onAttached(attachedDrivers)
            setRowSelection({})
            setOpen(false)
            toast.success(
                attachedDrivers.length === 1
                    ? `${attachedDrivers[0].display_name} now covers "${serviceAreaName}".`
                    : `${selectedIds.length} drivers now cover "${serviceAreaName}".`
            )
        } catch (error) {
            console.error(error)
            toast.error(describeWriteError(error, SERVICE_AREAS_EDIT, "Could not attach the selected drivers."))
        } finally {
            setIsAttaching(false)
        }
    }

    if (!canEdit) {
        // Disabled with the reason, so users know the action exists.
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                        <Button disabled data-testid="attach-drivers-button">
                            Attach Drivers
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        {permissionRequiredMessage(SERVICE_AREAS_EDIT)}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    // Drivers get work only from their own warehouse, so show it.
    const warehouseColumn: ColumnDef<ServiceAreaDriver>[] = [
        {
            id: "warehouse",
            header: "Warehouse",
            cell: ({ row }) => (
                <span className="text-muted-foreground">
                    {row.original.warehouse_name ?? "No warehouse"}
                </span>
            ),
        },
    ]

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger render={<Button data-testid="attach-drivers-button">Attach Drivers</Button>} />

            <SheetContent className="flex h-screen w-screen flex-col" data-testid="attach-drivers-sheet">
                <SheetHeader>
                    <SheetTitle>{`Attach drivers to "${serviceAreaName}"`}</SheetTitle>
                    <SheetDescription>
                        {/* No warehouse filter: service areas are not linked to warehouses. */}
                        Drivers already in this area are not listed. Drivers get work only from their
                        own warehouse, so check the Warehouse column.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-4">
                    {hasError ? (
                        <div
                            className="flex h-40 items-center justify-center rounded-md border border-destructive/40 bg-destructive/5 px-6 text-center text-sm"
                            data-testid="attach-drivers-error"
                        >
                            <div className="space-y-2">
                                <p>Drivers could not be loaded.</p>
                                <Button variant="outline" size="sm" onClick={() => void fetchDrivers(page)}>
                                    Try again
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <DriverTable
                            data={drivers}
                            loading={isLoading}
                            pageSize={PAGE_SIZE}
                            page={page}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            additionalColumns={warehouseColumn}
                            actions={(row) => {
                                // A row click toggles its selection.
                                setRowSelection((previous) => {
                                    if (previous[row.id]) {
                                        const { [row.id]: _removed, ...rest } = previous
                                        return rest
                                    }

                                    return { ...previous, [row.id]: true }
                                })
                            }}
                            rowSelection={rowSelection}
                            onRowSelectionChange={setRowSelection}
                        />
                    )}
                </div>

                <SheetFooter className="sticky bottom-0 z-10 border-t bg-background px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-sm text-muted-foreground" data-testid="attach-drivers-selection-count">
                            {selectedIds.length === 0
                                ? "No drivers selected."
                                : `${selectedIds.length} selected`}
                        </p>

                        <Button
                            onClick={() => void handleAttach()}
                            disabled={selectedIds.length === 0 || isAttaching}
                            data-testid="attach-drivers-confirm"
                        >
                            {isAttaching ? "Attaching..." : "Attach Selected"}
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
