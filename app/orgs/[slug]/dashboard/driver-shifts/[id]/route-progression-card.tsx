"use client"

import { useState, useMemo, useCallback, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PackageOptimisation } from "@/app/models/package-optimisation"
import { formatAddressLines } from "@/lib/customers/format-address"
import { PackageStatus, PackageStatusText } from "@/app/models/package-status"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
    Home,
    MoreVertical,
    Navigation,
    Package,
    Pencil,
    GripVertical,
    Trash2,
    User,
    X,
    Check,
    Loader2,
    AlertTriangle,
    Lock,
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
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
import { adjustRoute } from "@/lib/actions/route-adjustment"
import { useOrgSlug } from "@/lib/use-org"

/** Statuses that cannot be moved or deleted */
const LOCKED_STATUSES = ["DELIVERED", "IN_TRANSIT"] as const
type LockedStatus = (typeof LOCKED_STATUSES)[number]

function isLocked(status: string | null | undefined): status is LockedStatus {
    return LOCKED_STATUSES.includes(status as LockedStatus)
}

function getStatusVariant(
    status: string
): "default" | "secondary" | "destructive" | "outline" {
    switch (status.toUpperCase()) {
        case "DELIVERED":
            return "default"
        case "PENDING":
        case "ASSIGNED":
            return "secondary"
        case "FAILED":
            return "destructive"
        default:
            return "outline"
    }
}

/**
 * The current time, set after mount. Null on the server and in the first
 * render: cacheComponents does not allow `new Date()` while prerendering.
 */
function useNow(): Date | null {
    const [now, setNow] = useState<Date | null>(null)
    useEffect(() => {
        // Reading the clock is a sync with an external system.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNow(new Date())
    }, [])
    return now
}

/** A single draggable/deletable job step in edit mode */
function SortableJobStep({
    step,
    isLast,
    onDelete,
}: {
    step: PackageOptimisation
    isLast: boolean
    onDelete: (id: number) => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: step.id })
    const now = useNow()

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: "relative",
        zIndex: isDragging ? 10 : undefined,
    }

    const pkg = step.package_assignment?.package
    const status = pkg?.current_status

    return (
        <div ref={setNodeRef} style={style}>
            <div className="flex gap-4 items-start relative pb-4">
                {!isLast && (
                    <div className="absolute left-[15px] top-[32px] h-full border-l-2 border-dotted border-muted-foreground/30" />
                )}
                <button
                    className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background shadow-sm border-primary text-primary touch-none cursor-grab hover:bg-primary/10 transition-colors"
                    {...attributes}
                    {...listeners}
                    aria-label="Drag to reorder"
                >
                    <GripVertical className="h-4 w-4" />
                </button>

                <div className="flex-1 space-y-1 py-0.5">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                            {pkg && (
                                <div>
                                    <div className="text-sm font-medium text-foreground">
                                        {pkg.to_customer?.customer_name ?? "No recipient details"}
                                    </div>
                                    <div className="text-xs text-muted-foreground leading-tight space-y-0.5">
                                        {pkg.to_customer &&
                                            formatAddressLines(pkg.to_customer).map((line, i) => (
                                                <div key={i}>{line}</div>
                                            ))}
                                        <div>
                                            <span className="font-bold">Deliver by:</span>{" "}
                                            {pkg.package_delivery_window?.scheduled_arrival
                                                ? format(
                                                      pkg.package_delivery_window.scheduled_arrival,
                                                      "dd MMM yyyy hh:mm a"
                                                  )
                                                : "-"}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                            <div className="flex flex-col items-end gap-1">
                                {status && (
                                    <Badge variant={getStatusVariant(status)}>
                                        {PackageStatusText(status as PackageStatus)}
                                    </Badge>
                                )}
                                {(() => {
                                    const dw = pkg?.package_delivery_window
                                    if (!dw?.scheduled_arrival) return null
                                    const scheduled = new Date(dw.scheduled_arrival)
                                    const isLateFlag = dw.actual_arrival
                                        ? new Date(dw.actual_arrival) > scheduled
                                        : now !== null && now > scheduled
                                    return isLateFlag ? (
                                        <Badge variant="destructive">LATE</Badge>
                                    ) : null
                                })()}
                            </div>
                            <button
                                type="button"
                                onClick={() => onDelete(step.id)}
                                className="ml-1 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                aria-label="Remove from route"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

/** A step that cannot be dragged: all steps in view mode, locked steps in edit mode */
function StaticStepRow({
    step,
    index,
    totalSteps,
    warehouseInfo,
    editMode,
    disableInteractions = false,
}: {
    step: PackageOptimisation
    index: number
    totalSteps: number
    warehouseInfo: { id: string; warehouse_name: string; warehouse_address: string } | undefined
    editMode: boolean
    disableInteractions?: boolean
}) {
    const slug = useOrgSlug()
    const now = useNow()
    const pkg = step.package_assignment?.package
    const status = pkg?.current_status
    const showLockIcon = editMode && step.type === "job" && isLocked(status)

    return (
        <div className="flex gap-4 items-start relative pb-4 last:pb-0">
            {index !== totalSteps - 1 && (
                <div className="absolute left-[15px] top-[32px] h-full border-l-2 border-dotted border-muted-foreground/30" />
            )}
            <div
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background shadow-sm
                    ${step.type === "start"
                        ? "border-emerald-500 text-emerald-500"
                        : step.type === "end"
                        ? "border-rose-500 text-rose-500"
                        : editMode
                        ? "border-muted-foreground/50 text-muted-foreground/50"
                        : "border-primary text-primary"
                    }`}
            >
                {step.type === "start" || step.type === "end" ? (
                    <Home className="h-4 w-4" />
                ) : (
                    <Package className="h-4 w-4" />
                )}
            </div>

            <div className="flex-1 space-y-1 py-0.5">
                <div className="flex items-center justify-between">
                    {step.type === "start" || step.type === "end" ? (
                        disableInteractions ? (
                            <div className="flex flex-col gap-0.5">
                                <div className="text-sm font-medium text-foreground">
                                    {warehouseInfo?.warehouse_name ?? "Warehouse"}
                                </div>
                                {warehouseInfo?.warehouse_address && (
                                    <div className="text-xs text-muted-foreground leading-snug">
                                        {warehouseInfo.warehouse_address}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link
                                href={
                                    warehouseInfo?.id
                                        ? `/orgs/${slug}/dashboard/service/warehouse/${warehouseInfo.id}`
                                        : "#"
                                }
                                className="flex flex-col gap-0.5 group"
                            >
                                <div className="text-sm font-medium text-foreground group-hover:underline underline-offset-4 decoration-primary">
                                    {warehouseInfo?.warehouse_name ?? "Warehouse"}
                                </div>
                                {warehouseInfo?.warehouse_address && (
                                    <div className="text-xs text-muted-foreground leading-snug">
                                        {warehouseInfo.warehouse_address}
                                    </div>
                                )}
                            </Link>
                        )
                    ) : (
                        <div className="flex flex-col gap-0.5">
                            {step.package_assignment && (
                                <div>
                                    <div
                                        className={`text-sm font-medium ${
                                            editMode ? "text-muted-foreground" : "text-foreground"
                                        }`}
                                    >
                                        {pkg?.to_customer?.customer_name ?? "No recipient details"}
                                    </div>
                                    <div className="text-xs text-muted-foreground leading-tight space-y-0.5">
                                        {pkg?.to_customer &&
                                            formatAddressLines(pkg.to_customer).map((line, i) => (
                                                <div key={i}>{line}</div>
                                            ))}
                                        <span className="font-bold">Deliver by:</span>{" "}
                                        {pkg?.package_delivery_window?.scheduled_arrival
                                            ? format(
                                                  pkg.package_delivery_window.scheduled_arrival,
                                                  "dd MMM yyyy hh:mm a"
                                              )
                                            : "-"}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-1">
                        {showLockIcon && (
                            <Lock className="h-3.5 w-3.5 text-muted-foreground/60 mr-1" />
                        )}
                        <div className="flex flex-col items-end gap-1">
                            {status && (
                                <Badge variant={getStatusVariant(status)}>
                                    {PackageStatusText(status as PackageStatus)}
                                </Badge>
                            )}
                            {(() => {
                                const dw = pkg?.package_delivery_window
                                if (!dw?.scheduled_arrival) return null
                                const scheduled = new Date(dw.scheduled_arrival)
                                const isLateFlag = dw.actual_arrival
                                    ? new Date(dw.actual_arrival) > scheduled
                                    : now !== null && now > scheduled
                                return isLateFlag ? (
                                    <Badge variant="destructive">LATE</Badge>
                                ) : null
                            })()}
                        </div>
                        {!editMode && !disableInteractions && step.type !== "start" && step.type !== "end" && step.package_assignment && (
                            <DropdownMenu>
                                <DropdownMenuTrigger className="rounded-md p-1 hover:bg-muted transition-colors focus-visible:outline-none">
                                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" side="bottom">
                                    {pkg?.tracking_number && (
                                        <DropdownMenuItem>
                                            <Link
                                                href={`/orgs/${slug}/dashboard/packages/${pkg.tracking_number}`}
                                                className="flex items-center gap-3 w-full"
                                            >
                                                <Package className="h-4 w-4" />
                                                View Package
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                    {pkg?.to_customer?.id && (
                                        <DropdownMenuItem>
                                            <Link
                                                href={`/orgs/${slug}/dashboard/customers/${pkg.to_customer.id}`}
                                                className="flex items-center gap-3 w-full"
                                            >
                                                <User className="h-4 w-4" />
                                                View Customer
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export function RouteProgressionCard({
    routeSteps,
    routeId,
    disableInteractions = false,
}: {
    routeSteps: PackageOptimisation[]
    routeId: string
    disableInteractions?: boolean
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const [editMode, setEditMode] = useState(false)
    const [showWarning, setShowWarning] = useState(false)
    const [editableItems, setEditableItems] = useState<PackageOptimisation[]>([])
    const [deletedIds, setDeletedIds] = useState<number[]>([])
    const [saveError, setSaveError] = useState<string | null>(null)

    const warehouseInfo = routeSteps
        .find(s => s.package_assignment?.package?.warehouse)
        ?.package_assignment?.package?.warehouse

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    /** The highest step_index of a delivered or in-transit job. Steps up to it cannot move. */
    const lockBoundaryStepIndex = useMemo(() => {
        const lockedJobs = routeSteps.filter(
            s => s.type === "job" && isLocked(s.package_assignment?.package?.current_status)
        )
        return lockedJobs.length > 0
            ? Math.max(...lockedJobs.map(s => s.step_index))
            : -1
    }, [routeSteps])

    /** Steps rendered as static/locked in edit mode (start, end, and jobs at/above lock boundary) */
    const lockedDisplaySteps = useMemo(
        () =>
            routeSteps.filter(
                s =>
                    s.type === "start" ||
                    s.type === "end" ||
                    (s.type === "job" && s.step_index <= lockBoundaryStepIndex)
            ),
        [routeSteps, lockBoundaryStepIndex]
    )

    /** JOB steps that can be reordered and deleted (below the lock boundary) */
    const initialEditableSteps = useMemo(
        () =>
            routeSteps.filter(
                s => s.type === "job" && s.step_index > lockBoundaryStepIndex
            ),
        [routeSteps, lockBoundaryStepIndex]
    )

    const hasEditableSteps = initialEditableSteps.length > 0

    function enterEditMode() {
        setShowWarning(false)
        setEditableItems(initialEditableSteps)
        setDeletedIds([])
        setSaveError(null)
        setEditMode(true)
    }

    function cancelEditMode() {
        setEditMode(false)
        setEditableItems([])
        setDeletedIds([])
        setSaveError(null)
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (over && active.id !== over.id) {
            setEditableItems(items => {
                const oldIndex = items.findIndex(i => i.id === active.id)
                const newIndex = items.findIndex(i => i.id === over.id)
                return arrayMove(items, oldIndex, newIndex)
            })
        }
    }

    const handleDelete = useCallback((stepId: number) => {
        setDeletedIds(prev => [...prev, stepId])
        setEditableItems(prev => prev.filter(s => s.id !== stepId))
    }, [])

    async function handleSave() {
        setSaveError(null)

        const startStep = routeSteps.find(s => s.type === "start")
        const endStep = routeSteps.find(s => s.type === "end")
        const lockedJobsInOrder = routeSteps
            .filter(s => s.type === "job" && s.step_index <= lockBoundaryStepIndex)
            .sort((a, b) => a.step_index - b.step_index)

        const orderedStepIds: number[] = [
            ...(startStep ? [startStep.id] : []),
            ...lockedJobsInOrder.map(s => s.id),
            ...editableItems.map(s => s.id),
            ...(endStep ? [endStep.id] : []),
        ]

        startTransition(async () => {
            const result = await adjustRoute({
                routeId,
                orderedStepIds,
                deletedStepIds: deletedIds,
            })

            if (!result.success) {
                setSaveError(result.error)
                return
            }

            setEditMode(false)
            setEditableItems([])
            setDeletedIds([])
            router.refresh()
        })
    }

    const lockedDisplayStepsWithoutEnd = lockedDisplaySteps.filter(s => s.type !== "end")
    const endStep = lockedDisplaySteps.find(s => s.type === "end")

    return (
        <>
            <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Edit Route
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            <div className="space-y-2">
                                <p>
                                    You are about to change the route of an active shift. This can
                                    change the driver&apos;s navigation.
                                </p>
                                <p className="font-medium text-foreground">Rules:</p>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    <li>You cannot move or remove delivered and in-transit stops.</li>
                                    <li>You can move or remove pending and failed stops.</li>
                                    <li>You cannot move a stop before a delivered or in-transit stop.</li>
                                </ul>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={enterEditMode}>
                            Edit Route
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                            <Navigation className="h-5 w-5" />
                            Route Progression
                        </span>

                        {editMode ? (
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEditMode}
                                    disabled={isPending}
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSave}
                                    disabled={isPending}
                                >
                                    {isPending ? (
                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4 mr-1" />
                                    )}
                                    Save Changes
                                </Button>
                            </div>
                        ) : (
                            hasEditableSteps && !disableInteractions && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowWarning(true)}
                                >
                                    <Pencil className="h-4 w-4 mr-1" />
                                    Edit Route
                                </Button>
                            )
                        )}
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    {saveError && (
                        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            {saveError}
                        </div>
                    )}

                    {editMode ? (
                        <div className="space-y-0">
                            {/* Locked steps (start + locked jobs) */}
                            {lockedDisplayStepsWithoutEnd.map((step, index) => (
                                <StaticStepRow
                                    key={step.id}
                                    step={step}
                                    index={index}
                                    totalSteps={lockedDisplayStepsWithoutEnd.length}
                                    warehouseInfo={warehouseInfo ?? undefined}
                                    editMode={true}
                                    disableInteractions={disableInteractions}
                                />
                            ))}

                            {/* Drag-and-drop zone for editable steps */}
                            {editableItems.length > 0 ? (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={editableItems.map(s => s.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {editableItems.map((step, index) => (
                                            <SortableJobStep
                                                key={step.id}
                                                step={step}
                                                isLast={
                                                    index === editableItems.length - 1 && !endStep
                                                }
                                                onDelete={handleDelete}
                                            />
                                        ))}
                                    </SortableContext>
                                </DndContext>
                            ) : (
                                <div className="py-4 text-center text-sm text-muted-foreground">
                                    No stops can be changed.
                                </div>
                            )}

                            {/* End step always last */}
                            {endStep && (
                                <StaticStepRow
                                    step={endStep}
                                    index={0}
                                    totalSteps={1}
                                    warehouseInfo={warehouseInfo ?? undefined}
                                    editMode={true}
                                    disableInteractions={disableInteractions}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {routeSteps.map((step, index) => (
                                <StaticStepRow
                                    key={step.id ?? index}
                                    step={step}
                                    index={index}
                                    totalSteps={routeSteps.length}
                                    warehouseInfo={warehouseInfo ?? undefined}
                                    editMode={false}
                                    disableInteractions={disableInteractions}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    )
}
