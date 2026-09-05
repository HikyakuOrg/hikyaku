"use client"

import { useRef, useState } from "react"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { toast } from "sonner"

import { DriverTable } from "@/components/driver/driver-table"
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
    /**
     * Whether the signed-in user holds `service_areas.edit`. Resolved server-side
     * by the page. UI gating only: the RLS policies on `driver_service_area` are
     * what actually refuse the insert.
     */
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
    const [open, setOpen] = useState(false)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [drivers, setDrivers] = useState<ServiceAreaDriver[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [isAttaching, setIsAttaching] = useState(false)

    // Selection survives paging (TanStack keys it by row id), so by the time the
    // footer commits, the rows a dispatcher ticked on page one are no longer in
    // `drivers`. Keep every row this sheet has loaded so the list behind it can
    // be updated with all of them, not just the page on screen.
    const loadedDriversRef = useRef(new Map<string, ServiceAreaDriver>())

    const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])

    const fetchDrivers = async (nextPage: number) => {
        setIsLoading(true)
        setHasError(false)

        try {
            const result = await getAttachableDriversForServiceArea(serviceAreaId, nextPage, PAGE_SIZE)

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
            // Re-read on every open. Drivers attached since the last time this
            // was opened have to disappear from the picker, and that exclusion
            // is resolved by the query rather than held in state here.
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
            // Awaited, and the local list is only told about it afterwards.
            // Reporting success alongside the request would report a refused
            // write as a success and leave the page claiming coverage the
            // database never accepted.
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
            // Hiding the control is UX; RLS is the boundary, and it can still
            // refuse a write (a permission revoked after this page rendered), so
            // translate the PostgREST code rather than show the raw string.
            toast.error(describeWriteError(error, SERVICE_AREAS_EDIT, "Failed to attach the selected drivers."))
        } finally {
            setIsAttaching(false)
        }
    }

    if (!canEdit) {
        // Disabled with the reason attached rather than hidden, so it is clear
        // the action exists and what is missing, and rather than live, which
        // would offer a write RLS is certain to refuse.
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

    // A driver's warehouse decides whether attaching them does anything at all,
    // so it is a column here rather than a filter. See the sheet description.
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
                        {/*
                            THE WAREHOUSE DECISION, STATED WHERE IT IS MADE.

                            Every driver in the organisation is offered here,
                            whichever warehouse they work out of, and the picker
                            deliberately does not narrow that down. Nothing in the
                            schema links a service area to a warehouse, so there is
                            no signal to filter on that would not be a guess; and
                            dispatch already scopes its candidates to one
                            warehouse, so an attachment that crosses depots is
                            inert rather than dangerous. Showing the warehouse as
                            a column lets a dispatcher judge that for themselves,
                            which is the honest version of a filter we cannot
                            write correctly.
                        */}
                        Drivers already covering this area are not listed. Every other driver in the
                        organisation is, whichever warehouse they work from: dispatch only offers a
                        driver work out of their own warehouse, so attaching someone based elsewhere
                        will not change what happens to packages sent from that other warehouse.
                    </SheetDescription>
                    <p className="text-sm text-muted-foreground">
                        A driver with no service areas at all is a floater and can be given work
                        anywhere. Attaching a driver to their first area ends that: from then on they
                        are only offered work inside the areas they cover.
                    </p>
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
                                // Clicking a row ticks it. A picker has nowhere
                                // to navigate to, and many-to-many means several
                                // rows at once, so this never clears the rest.
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
                                : `${selectedIds.length} selected. They all go in one save.`}
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
