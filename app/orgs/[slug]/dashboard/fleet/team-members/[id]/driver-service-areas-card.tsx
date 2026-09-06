"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

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
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxItem,
    ComboboxList,
    useComboboxAnchor,
} from "@/components/ui/combobox"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { SERVICE_AREAS_EDIT, describeWriteError, permissionRequiredMessage } from "@/lib/permissions"
import {
    attachServiceAreasToDriver,
    detachServiceAreaFromDriver,
    getServiceAreasByDriver,
    searchAttachableServiceAreasForDriver,
    type DriverServiceArea,
} from "@/lib/supabase/db"

/**
 * "Where does this driver work" — the driver-first read of the same
 * `driver_service_area` link HIK-15's area page manages from the area side.
 * Both screens write through the same functions in `lib/supabase/db.ts`
 * (`attachServiceAreasToDriver` / `detachServiceAreaFromDriver`, sharing the
 * link table with `attachDriversToServiceArea` / `detachDriverFromServiceArea`),
 * so the two can never disagree about what got saved.
 */
export function DriverServiceAreasCard({
    driverId,
    slug,
    canEdit,
}: {
    driverId: string
    slug: string
    canEdit: boolean
}) {
    const [areas, setAreas] = useState<DriverServiceArea[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [hasError, setHasError] = useState(false)
    const [pendingRemove, setPendingRemove] = useState<DriverServiceArea | null>(null)
    const [isRemoving, setIsRemoving] = useState(false)

    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [options, setOptions] = useState<DriverServiceArea[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    // Selected ids are strings (the combobox Value type), so labels for the
    // chips and the commit toast are looked up here rather than carried on
    // the value itself.
    const knownAreasRef = useRef(new Map<string, DriverServiceArea>())
    const anchor = useComboboxAnchor()

    const loadAreas = useCallback(async () => {
        setIsLoading(true)
        setHasError(false)

        try {
            setAreas(await getServiceAreasByDriver(driverId))
        } catch (error) {
            console.error(error)
            // A driver covering nothing and a read that failed both show as an
            // empty list; only one of them means this driver is a floater.
            setAreas([])
            setHasError(true)
        } finally {
            setIsLoading(false)
        }
    }, [driverId])

    useEffect(() => {
        void loadAreas()
    }, [loadAreas])

    function handleSearchInput(text: string) {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

        searchTimerRef.current = setTimeout(async () => {
            setIsSearching(true)
            try {
                const results = await searchAttachableServiceAreasForDriver(driverId, text)
                for (const area of results) knownAreasRef.current.set(area.id, area)
                setOptions(results)
            } catch (error) {
                console.error(error)
                setOptions([])
            } finally {
                setIsSearching(false)
            }
        }, 300)
    }

    async function handleAdd() {
        if (selectedIds.length === 0) return

        setIsAdding(true)

        try {
            // Awaited before the list or the chips clear: reporting success
            // ahead of the write resolving would claim coverage the database
            // never accepted.
            await attachServiceAreasToDriver(driverId, selectedIds)

            const attached = selectedIds
                .map((id) => knownAreasRef.current.get(id))
                .filter((area): area is DriverServiceArea => area !== undefined)

            setAreas((current) => {
                const byId = new Map(current.map((area) => [area.id, area]))
                for (const area of attached) byId.set(area.id, area)
                return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
            })

            toast.success(
                attached.length === 1
                    ? `This driver now covers "${attached[0].name}".`
                    : `This driver now covers ${attached.length} more areas.`
            )
            setSelectedIds([])
            setOptions([])
        } catch (error) {
            console.error(error)
            toast.error(describeWriteError(error, SERVICE_AREAS_EDIT, "Failed to add the selected areas."))
        } finally {
            setIsAdding(false)
        }
    }

    async function handleConfirmRemove() {
        const area = pendingRemove
        if (!area) return

        setIsRemoving(true)

        try {
            await detachServiceAreaFromDriver(driverId, area.id)
            setAreas((current) => current.filter((candidate) => candidate.id !== area.id))
            setPendingRemove(null)
            toast.success(`This driver no longer covers "${area.name}".`)
        } catch (error) {
            console.error(error)
            toast.error(describeWriteError(error, SERVICE_AREAS_EDIT, "Failed to remove the area."))
        } finally {
            setIsRemoving(false)
        }
    }

    return (
        <div className="space-y-4" data-testid="driver-service-areas">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="font-medium">Service Areas</h2>
                    <p className="text-sm text-muted-foreground max-w-2xl">
                        The territories this driver covers. A driver can cover several areas, and
                        adding one here does not remove any other.
                    </p>
                </div>
            </div>

            {canEdit ? (
                <div className="max-w-md space-y-2">
                    <Combobox
                        multiple
                        value={selectedIds}
                        onValueChange={setSelectedIds}
                        onInputValueChange={handleSearchInput}
                        itemToStringLabel={(id: string) => knownAreasRef.current.get(id)?.name ?? id}
                    >
                        <ComboboxChips ref={anchor} data-testid="driver-service-areas-picker">
                            {selectedIds.map((id) => (
                                <ComboboxChip key={id}>
                                    {knownAreasRef.current.get(id)?.name ?? id}
                                </ComboboxChip>
                            ))}
                            <ComboboxChipsInput placeholder="Search areas to add…" />
                        </ComboboxChips>

                        <ComboboxContent anchor={anchor}>
                            <ComboboxList>
                                {isSearching && options.length === 0 ? (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Searching…</div>
                                ) : options.length === 0 ? (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                        No matching areas
                                    </div>
                                ) : (
                                    options.map((area) => (
                                        <ComboboxItem key={area.id} value={area.id}>
                                            {area.name}
                                        </ComboboxItem>
                                    ))
                                )}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>

                    <div className="flex items-center justify-between gap-4">
                        <p className="text-sm text-muted-foreground" data-testid="driver-service-areas-selection-count">
                            {selectedIds.length === 0
                                ? "No areas selected."
                                : `${selectedIds.length} selected.`}
                        </p>
                        <Button
                            size="sm"
                            onClick={() => void handleAdd()}
                            disabled={selectedIds.length === 0 || isAdding}
                            data-testid="driver-service-areas-add"
                        >
                            {isAdding ? "Adding…" : "Add"}
                        </Button>
                    </div>
                </div>
            ) : (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger render={<span className="inline-flex" />}>
                            <Button size="sm" disabled data-testid="driver-service-areas-add">
                                Add area
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            {permissionRequiredMessage(SERVICE_AREAS_EDIT)}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {hasError ? (
                <div
                    className="flex h-24 w-full items-center justify-center rounded-md border border-destructive/40 bg-destructive/5 px-6 text-center"
                    data-testid="driver-service-areas-error"
                >
                    <div className="space-y-2">
                        <p className="text-sm font-medium">This driver&apos;s areas could not be loaded</p>
                        <Button variant="outline" size="sm" onClick={() => void loadAreas()}>
                            Try again
                        </Button>
                    </div>
                </div>
            ) : isLoading ? (
                <div className="h-16 w-full animate-pulse rounded-md bg-muted/40" />
            ) : areas.length === 0 ? (
                <div
                    className="w-full rounded-md border bg-muted/20 px-4 py-4 text-sm text-muted-foreground"
                    data-testid="driver-service-areas-empty"
                >
                    This driver is a floater: they cover no areas of their own, so they can be given
                    work anywhere at their warehouse. Adding their first area here ends that — from
                    then on they are only offered work inside the areas they cover.
                </div>
            ) : (
                <ul className="flex flex-wrap gap-2" data-testid="driver-service-areas-list">
                    {areas.map((area) => (
                        <li
                            key={area.id}
                            className="flex items-center gap-1 rounded-full border bg-muted/30 py-1 pl-3 pr-1 text-sm"
                        >
                            <Link
                                href={`/orgs/${slug}/dashboard/service/areas/${area.id}`}
                                className="hover:underline underline-offset-2"
                            >
                                {area.name}
                            </Link>
                            {canEdit && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    aria-label={`Remove ${area.name}`}
                                    onClick={() => setPendingRemove(area)}
                                >
                                    <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <AlertDialog
                open={pendingRemove !== null}
                onOpenChange={(open) => {
                    if (!open && !isRemoving) setPendingRemove(null)
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {`Remove "${pendingRemove?.name ?? ""}" from this driver?`}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {`This does not move work that already exists. Coverage is decided once, when a package is created, so any stop already on this driver's route stays there — this only changes packages created from now on. ${areas.length <= 1 ? "This is their last area, so removing it makes them a floater again: they can be given work anywhere at their warehouse." : ""}`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={isRemoving}
                            onClick={() => void handleConfirmRemove()}
                        >
                            {isRemoving ? "Removing…" : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
