"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import { DriverTable } from "@/components/driver/driver-table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { SERVICE_AREAS_EDIT, describeWriteError, permissionRequiredMessage } from "@/lib/permissions"
import {
    detachDriverFromServiceArea,
    getDriversByServiceArea,
    type ServiceAreaDriver,
} from "@/lib/supabase/db"

import { ServiceAreaDriverSheet } from "./service-area-driver-sheet"

const PAGE_SIZE = 10

type ServiceAreaDriversCardProps = {
    serviceAreaId: string
    serviceAreaName: string
    canEdit: boolean
}

function DetachDriverButton({
    driver,
    canEdit,
    onRequestDetach,
}: {
    driver: ServiceAreaDriver
    canEdit: boolean
    onRequestDetach: (driver: ServiceAreaDriver) => void
}) {
    if (!canEdit) {
        // Disabled with the reason attached rather than hidden, so it is clear
        // the action exists and what is missing, and rather than live, which
        // would offer a write RLS is certain to refuse.
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled
                            aria-label={`Detach ${driver.display_name}`}
                        >
                            <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        {permissionRequiredMessage(SERVICE_AREAS_EDIT)}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label={`Detach ${driver.display_name}`}
            onClick={() => onRequestDetach(driver)}
        >
            <Trash2 className="size-4 text-destructive" />
        </Button>
    )
}

/**
 * Who covers this territory, and the two controls that change it.
 *
 * Coverage is many-to-many in both directions: a driver covers as many areas as
 * a dispatcher attaches them to, and an area is covered by as many drivers as
 * they staff it with. Overlapping coverage is a legitimate configuration, not a
 * mistake, so nothing here is single-select and nothing implies a driver belongs
 * to this area alone.
 */
export function ServiceAreaDriversCard({
    serviceAreaId,
    serviceAreaName,
    canEdit,
}: ServiceAreaDriversCardProps) {
    const router = useRouter()
    const { slug } = useParams<{ slug: string }>()
    const [drivers, setDrivers] = useState<ServiceAreaDriver[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [hasError, setHasError] = useState(false)
    const [page, setPage] = useState(1)
    const [pendingDetachDriver, setPendingDetachDriver] = useState<ServiceAreaDriver | null>(null)
    const [isDetaching, setIsDetaching] = useState(false)

    const loadDrivers = useCallback(async () => {
        setIsLoading(true)
        setHasError(false)

        try {
            setDrivers(await getDriversByServiceArea(serviceAreaId))
        } catch (error) {
            console.error(error)
            // An area nobody covers and a read that failed look identical as an
            // empty list, and only one of them means coverage falls back to the
            // floater rule. Say which this is.
            setDrivers([])
            setHasError(true)
        } finally {
            setIsLoading(false)
        }
    }, [serviceAreaId])

    useEffect(() => {
        void loadDrivers()
    }, [loadDrivers])

    const handleAttached = (attachedDrivers: ServiceAreaDriver[]) => {
        setDrivers((current) => {
            const byId = new Map(current.map((driver) => [driver.id, driver]))

            for (const driver of attachedDrivers) {
                byId.set(driver.id, driver)
            }

            return Array.from(byId.values())
                .sort((left, right) => left.display_name.localeCompare(right.display_name))
        })
    }

    const handleConfirmDetach = async () => {
        const driver = pendingDetachDriver

        if (!driver) {
            return
        }

        setIsDetaching(true)

        try {
            // Awaited before anything else happens. Dropping the row first and
            // reporting success alongside the request would report a refused
            // write as a success and leave the page disagreeing with the
            // database about who covers this territory.
            await detachDriverFromServiceArea(serviceAreaId, driver.id)

            const remainingDrivers = drivers.filter((candidate) => candidate.id !== driver.id)
            setDrivers(remainingDrivers)
            setPage((current) => Math.min(
                current,
                Math.max(1, Math.ceil(remainingDrivers.length / PAGE_SIZE))
            ))
            setPendingDetachDriver(null)
            toast.success(`${driver.display_name} no longer covers "${serviceAreaName}".`)
        } catch (error) {
            console.error(error)
            // Hiding the control is UX; RLS is the boundary, and it can still
            // refuse a write (a permission revoked after this page rendered), so
            // translate the PostgREST code rather than show the raw string.
            toast.error(describeWriteError(error, SERVICE_AREAS_EDIT, "Failed to detach the driver."))
        } finally {
            setIsDetaching(false)
        }
    }

    const totalPages = Math.max(1, Math.ceil(drivers.length / PAGE_SIZE))
    // Detaching the last row of the last page leaves the page number past the end.
    const currentPage = Math.min(page, totalPages)
    const pageDrivers = drivers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    const columns: ColumnDef<ServiceAreaDriver>[] = [
        {
            id: "warehouse",
            header: "Warehouse",
            cell: ({ row }) => (
                <span className="text-muted-foreground">
                    {row.original.warehouse_name ?? "No warehouse"}
                </span>
            ),
        },
        {
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => (
                // Same guard the selection checkbox uses: without it the click
                // bubbles to the row and navigates away from the dialog.
                <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
                    <DetachDriverButton
                        driver={row.original}
                        canEdit={canEdit}
                        onRequestDetach={setPendingDetachDriver}
                    />
                </div>
            ),
        },
    ]

    return (
        <div className="space-y-4" data-testid="service-area-drivers">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl space-y-1">
                    <h2 className="text-lg font-semibold tracking-tight">Drivers covering this area</h2>
                    <p className="text-sm text-muted-foreground">
                        A driver can cover several areas and an area can be covered by several
                        drivers. Overlapping coverage is normal, and attaching a driver here does not
                        take them off any other area. Each driver&apos;s warehouse is listed because
                        dispatch only offers them work out of that warehouse, so covering this area
                        changes nothing for packages sent from a different one.
                    </p>
                </div>

                <ServiceAreaDriverSheet
                    serviceAreaId={serviceAreaId}
                    serviceAreaName={serviceAreaName}
                    canEdit={canEdit}
                    onAttached={handleAttached}
                />
            </div>

            {/*
                THE FLOATER RULE, IN THE PLACE A DISPATCHER FIRST MEETS IT.

                It is decided and implemented on the backend, it is invisible in
                the schema, and this page is where somebody notices a driver
                missing from every area's list and has to know what that means.
                Stated in both the empty and the filled state, because it matters
                either way: a staffed area still leaves every unstaffed driver
                free to work here.
            */}
            <p
                className="max-w-3xl rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
                data-testid="service-area-floater-note"
            >
                A driver with no service areas at all is a floater: they can be given work anywhere,
                including here. Attaching a driver to their first area ends that, and from then on
                they are only offered work inside the areas they cover. Detaching a driver from the
                last area they cover makes them a floater again.
            </p>

            {hasError ? (
                <div
                    className="flex h-40 w-full items-center justify-center rounded-xl border border-destructive/40 bg-destructive/5 px-6 text-center"
                    data-testid="service-area-drivers-error"
                >
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Drivers for this area could not be loaded</p>
                        <p className="text-sm text-muted-foreground">
                            This is a problem reading them, not an area nobody covers.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => void loadDrivers()}>
                            Try again
                        </Button>
                    </div>
                </div>
            ) : isLoading ? (
                <DriverTable
                    data={[]}
                    loading
                    pageSize={PAGE_SIZE}
                    page={1}
                    totalPages={1}
                    onPageChange={() => { }}
                    additionalColumns={columns}
                    actions={() => { }}
                />
            ) : drivers.length === 0 ? (
                <div
                    className="w-full rounded-xl border bg-muted/20 px-6 py-10 text-center"
                    data-testid="service-area-drivers-empty"
                >
                    <div className="mx-auto max-w-2xl space-y-2">
                        <h3 className="text-base font-semibold">Nobody is attached to this area yet</h3>
                        <p className="text-sm text-muted-foreground">
                            That is a normal state, not an error, and it does not stop deliveries here.
                            Until somebody is attached, this territory is served the way it was before
                            it was drawn: every driver who covers no areas of their own can still be
                            given work inside it.
                        </p>
                    </div>
                </div>
            ) : (
                <DriverTable
                    data={pageDrivers}
                    loading={false}
                    pageSize={PAGE_SIZE}
                    page={currentPage}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    additionalColumns={columns}
                    actions={(row) => router.push(`/orgs/${slug}/dashboard/fleet/team-members/${row.id}`)}
                />
            )}

            <AlertDialog
                open={pendingDetachDriver !== null}
                onOpenChange={(open) => {
                    if (!open && !isDetaching) {
                        setPendingDetachDriver(null)
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle data-testid="service-area-detach-confirmation-title">
                            {`Detach ${pendingDetachDriver?.display_name ?? ""} from "${serviceAreaName}"?`}
                        </AlertDialogTitle>
                        <AlertDialogDescription data-testid="service-area-detach-confirmation-description">
                            {`This does not move work that already exists. Coverage is decided once, when a package is created, so any stop already on ${pendingDetachDriver?.display_name ?? "this driver"}'s route stays there, and this is not a way to pull them off today's run. It only changes packages created from now on. If this is the last area they cover, they become a floater again and can be given work anywhere.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            disabled={isDetaching}
                            data-testid="service-area-detach-confirmation-cancel"
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={isDetaching}
                            onClick={() => {
                                void handleConfirmDetach()
                            }}
                            data-testid="service-area-detach-confirmation-ok"
                        >
                            {isDetaching ? "Detaching..." : "Detach"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
