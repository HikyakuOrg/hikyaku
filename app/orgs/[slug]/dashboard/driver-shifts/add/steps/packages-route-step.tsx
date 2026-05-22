"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { TableLayout } from "@/components/table-layout"
import { RouteMap, RouteStep } from "@/components/route-map"
import { UnassignedPackage } from "@/lib/supabase/db-server"
import { WarehouseStepData } from "@/app/orgs/[slug]/dashboard/driver-shifts/add/steps/warehouse-step"
import { getRoutePreview } from "@/lib/actions/route"
import { fetchUnassignedPackages } from "@/lib/actions/shift"
import { DirectionsResponse } from "ors-client"
import { cn } from "@/lib/utils"
import { GripVertical, X, Loader2 } from "lucide-react"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core"
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export interface PackagesRouteStepData {
    orderedPackages: Array<{
        packageId: string
        customerLng: number
        customerLat: number
    }>
    orsRoute: DirectionsResponse
}

const columns: ColumnDef<UnassignedPackage>[] = [
    {
        accessorKey: "tracking_number",
        header: "Tracking #",
        cell: ({ row }) => (
            <span className="font-mono text-sm">{row.original.tracking_number ?? "—"}</span>
        ),
    },
    {
        id: "customer",
        header: "Customer",
        cell: ({ row }) => (
            <div className="max-w-[200px]">
                <p className="font-medium truncate">{row.original.customer_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground truncate">
                    {[row.original.customer_suburb, row.original.customer_state]
                        .filter(Boolean)
                        .join(", ")}
                </p>
            </div>
        ),
    },
    {
        id: "weight",
        header: "Weight",
        cell: ({ row }) => (
            <span>{row.original.weight_kg != null ? `${row.original.weight_kg} kg` : "—"}</span>
        ),
    },
    {
        id: "dims",
        header: "Dimensions",
        cell: ({ row }) => {
            const { length_cm, width_cm, height_cm } = row.original
            if (!length_cm && !width_cm && !height_cm) return <span>—</span>
            return <span className="text-xs">{length_cm}×{width_cm}×{height_cm} cm</span>
        },
    },
]

function SortablePackageRow({
    pkg,
    index,
    onRemove,
}: {
    pkg: UnassignedPackage
    index: number
    onRemove: (id: string) => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pkg.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm"
        >
            <button
                className="touch-none cursor-grab text-muted-foreground hover:text-foreground"
                {...attributes}
                {...listeners}
            >
                <GripVertical className="h-4 w-4" />
            </button>
            <span className="text-muted-foreground w-5 shrink-0">{index + 1}</span>
            <div className="flex-1 min-w-0">
                <p className="font-mono text-xs truncate">{pkg.tracking_number ?? pkg.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground truncate">{pkg.customer_name ?? "—"}</p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
                {pkg.weight_kg != null ? `${pkg.weight_kg} kg` : "—"}
            </span>
            <button
                type="button"
                onClick={() => onRemove(pkg.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    )
}

export function PackagesRouteStep({
    warehouse,
    vehicleGrossLimits,
    vehicleOrsType,
    defaultValues,
    onNext,
    onPrev,
}: {
    warehouse: WarehouseStepData
    vehicleGrossLimits: number
    vehicleOrsType: string
    defaultValues?: PackagesRouteStepData
    onNext: (data: PackagesRouteStepData) => void
    onPrev: () => void
}) {
    const [packages, setPackages] = useState<UnassignedPackage[]>([])
    const [packagesLoading, setPackagesLoading] = useState(true)
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [routeList, setRouteList] = useState<UnassignedPackage[]>([])
    const [orsRoute, setOrsRoute] = useState<DirectionsResponse | null>(
        defaultValues?.orsRoute ?? null
    )
    const [routeLoading, setRouteLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Fetch unassigned packages for this warehouse
    useEffect(() => {
        setPackagesLoading(true)
        fetchUnassignedPackages(warehouse.warehouseId)
            .then((pkgs) => {
                setPackages(pkgs)
                // Restore default route list once packages are loaded
                if (defaultValues) {
                    const restored = defaultValues.orderedPackages
                        .map((op) => pkgs.find((p) => p.id === op.packageId))
                        .filter(Boolean) as UnassignedPackage[]
                    setRouteList(restored)
                }
            })
            .catch(() => setError("Failed to load packages."))
            .finally(() => setPackagesLoading(false))
    }, [warehouse.warehouseId]) // eslint-disable-line react-hooks/exhaustive-deps

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const totalWeight = routeList.reduce((sum, p) => sum + (p.weight_kg ?? 0), 0)
    const overCapacity = vehicleGrossLimits > 0 && totalWeight > vehicleGrossLimits

    // Build route steps for the map — memoized so row-selection state changes don't
    // recreate the array reference and trigger a full map teardown/rebuild.
    const routeSteps: RouteStep[] = useMemo(() => [
        {
            coords: [warehouse.warehouseLocation[0], warehouse.warehouseLocation[1]],
            type: "start",
            warehouse_name: warehouse.warehouseName,
        },
        ...routeList.map((p) => ({
            coords: [p.customer_lng ?? 0, p.customer_lat ?? 0],
            type: "job" as const,
            customer_name: p.customer_name ?? undefined,
            customer_address: p.customer_address ?? undefined,
        })),
        {
            coords: [warehouse.warehouseLocation[0], warehouse.warehouseLocation[1]],
            type: "end",
            warehouse_name: warehouse.warehouseName,
        },
    ], [warehouse, routeList])

    const fetchRoute = useCallback(
        (list: UnassignedPackage[]) => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
            if (list.length === 0) {
                setOrsRoute(null)
                return
            }

            debounceRef.current = setTimeout(async () => {
                setRouteLoading(true)
                try {
                    const coords: [number, number][] = [
                        [warehouse.warehouseLocation[0], warehouse.warehouseLocation[1]],
                        ...list.map((p): [number, number] => [p.customer_lng ?? 0, p.customer_lat ?? 0]),
                        [warehouse.warehouseLocation[0], warehouse.warehouseLocation[1]],
                    ]
                    const route = await getRoutePreview(vehicleOrsType, coords)
                    setOrsRoute(route)
                } catch {
                    // Route preview failed silently — user can still submit
                } finally {
                    setRouteLoading(false)
                }
            }, 1000)
        },
        [warehouse, vehicleOrsType]
    )

    useEffect(() => {
        fetchRoute(routeList)
    }, [routeList, fetchRoute])

    function handleAddToRoute() {
        const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k])
        const toAdd = selectedIds
            .map((id) => packages.find((p) => p.id === id))
            .filter(Boolean)
            .filter((p) => !routeList.some((r) => r!.id === p!.id)) as UnassignedPackage[]

        if (toAdd.length === 0) return
        const newList = [...routeList, ...toAdd]
        setRouteList(newList)
        setRowSelection({})
    }

    function handleRemove(id: string) {
        setRouteList((prev) => prev.filter((p) => p.id !== id))
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (over && active.id !== over.id) {
            setRouteList((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id)
                const newIndex = items.findIndex((i) => i.id === over.id)
                return arrayMove(items, oldIndex, newIndex)
            })
        }
    }

    function handleSubmit() {
        if (routeList.length === 0) {
            setError("Add at least one package to the route.")
            return
        }
        const missingCoords = routeList.filter((p) => p.customer_lng == null || p.customer_lat == null)
        if (missingCoords.length > 0) {
            setError(
                `${missingCoords.length} package(s) are missing delivery coordinates and cannot be routed.`
            )
            return
        }
        if (!orsRoute) {
            setError("Route preview not available. Please wait for the map to load.")
            return
        }
        onNext({
            orderedPackages: routeList.map((p) => ({
                packageId: p.id,
                customerLng: p.customer_lng!,
                customerLat: p.customer_lat!,
            })),
            orsRoute,
        })
    }

    const availablePackages = packages.filter((p) => !routeList.some((r) => r.id === p.id))

    return (
        <div className="space-y-6">
            <div>
                <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">Packages & Route</h3>
                <p className="text-muted-foreground mt-2 leading-7">
                    Select packages and arrange the delivery order. The map updates automatically.
                </p>
            </div>

            {/* Package selection table */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Available Packages</h4>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddToRoute}
                        disabled={Object.keys(rowSelection).filter((k) => rowSelection[k]).length === 0}
                    >
                        Add to Route
                    </Button>
                </div>
                {packagesLoading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading packages...
                    </div>
                ) : availablePackages.length === 0 ? (
                    <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                        No unassigned packages available for this warehouse.
                    </div>
                ) : (
                    <TableLayout
                        data={availablePackages}
                        columns={columns}
                        loading={false}
                        pageSize={availablePackages.length}
                        actions={() => { }}
                        rowSelection={rowSelection}
                        onRowSelectionChange={setRowSelection}
                    />
                )}
            </div>

            {/* Sortable route list */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Route Order</h4>
                    <span
                        className={cn(
                            "text-sm font-medium",
                            overCapacity ? "text-destructive" : "text-muted-foreground"
                        )}
                    >
                        {totalWeight.toFixed(1)} kg
                        {vehicleGrossLimits > 0 && ` / ${vehicleGrossLimits} kg`}
                        {overCapacity && " — Over capacity!"}
                    </span>
                </div>

                {routeList.length === 0 ? (
                    <div className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                        No packages in route. Select packages above and click "Add to Route".
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={routeList.map((p) => p.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-1.5">
                                {routeList.map((pkg, index) => (
                                    <SortablePackageRow
                                        key={pkg.id}
                                        pkg={pkg}
                                        index={index}
                                        onRemove={handleRemove}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* Route map */}
            {(routeList.length > 0 || orsRoute) && (
                <RouteMap
                    routeSteps={routeSteps}
                    route={orsRoute}
                    isLoading={routeLoading}
                    height="400px"
                />
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-between">
                <Button variant="outline" onClick={onPrev}>Back</Button>
                <Button onClick={handleSubmit} disabled={routeList.length === 0}>
                    Next
                </Button>
            </div>
        </div>
    )
}
