"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import { DataTable } from "@/components/data-table"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
    formatDimensionValue,
    type DrivingLimitProfile,
    type LimitDimension,
} from "@/lib/driving-limits"
import { DRIVERS_UPDATE, describeWriteError, permissionRequiredMessage } from "@/lib/permissions"
import { deleteDrivingLimitProfile } from "@/lib/supabase/db"

const PAGE_SIZE = 10

type DrivingLimitProfilesTableProps = {
    slug: string
    profiles: DrivingLimitProfile[]
    /** The organisation default, already narrowed to a live profile or null. */
    defaultProfileId: string | null
    /** Drivers pointing at each profile, keyed by profile id. */
    driverCounts: Record<string, number>
    canEdit: boolean
}

function LimitCell({ dimension, value }: { dimension: LimitDimension; value: number | null }) {
    if (value == null) {
        return <span className="text-muted-foreground">No limit</span>
    }
    return <span>{formatDimensionValue(dimension, value)}</span>
}

function driversPhrase(count: number) {
    return count === 1 ? "the 1 driver" : `the ${count} drivers`
}

/**
 * What retiring a profile does to the drivers resolving through it. The
 * resolver treats a retired profile as absent, so its drivers fall through to
 * the organisation default, and if it was the default, to no limit at all.
 */
function deleteConsequence(profile: DrivingLimitProfile, count: number, defaultProfileId: string | null) {
    if (profile.id === defaultProfileId) {
        return count > 0
            ? `It is the organisation default, so ${driversPhrase(count)} using it and every driver without a profile of their own will have no driving limits.`
            : "It is the organisation default, so every driver without a profile of their own will have no driving limits."
    }
    if (count === 0) {
        return "No drivers use it."
    }
    return defaultProfileId
        ? `${driversPhrase(count)[0].toUpperCase()}${driversPhrase(count).slice(1)} using it will follow the organisation default instead.`
        : `${driversPhrase(count)[0].toUpperCase()}${driversPhrase(count).slice(1)} using it will have no driving limits, because the organisation has no default.`
}

export function DrivingLimitProfilesTable({
    slug,
    profiles: serverProfiles,
    defaultProfileId,
    driverCounts,
    canEdit,
}: DrivingLimitProfilesTableProps) {
    const router = useRouter()
    // Derived from the server's list rather than copied into state: this page's
    // client state survives a navigation away and back, and a copy would keep
    // hiding a profile created in between.
    const [deletedIds, setDeletedIds] = useState<ReadonlySet<string>>(() => new Set())
    const profiles = serverProfiles.filter((profile) => !deletedIds.has(profile.id))
    const [page, setPage] = useState(1)
    const [pendingDelete, setPendingDelete] = useState<DrivingLimitProfile | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const totalPages = Math.max(1, Math.ceil(profiles.length / PAGE_SIZE))
    const currentPage = Math.min(page, totalPages)
    const pageProfiles = profiles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    async function handleConfirmDelete() {
        const profile = pendingDelete
        if (!profile) return

        setIsDeleting(true)

        try {
            // Awaited before the row goes: a refused write reported as a success
            // would leave the list disagreeing with the table.
            await deleteDrivingLimitProfile(profile.id)
            setDeletedIds((current) => new Set(current).add(profile.id))
            setPendingDelete(null)
            toast.success(`"${profile.name}" deleted.`)
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error(describeWriteError(error, DRIVERS_UPDATE, "Failed to delete the profile."))
        } finally {
            setIsDeleting(false)
        }
    }

    const columns: ColumnDef<DrivingLimitProfile>[] = [
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => (
                <span className="flex items-center gap-2">
                    <span className="font-medium">{row.original.name}</span>
                    {row.original.id === defaultProfileId && (
                        <Badge variant="secondary" data-testid="driving-limit-default-badge">
                            Organisation default
                        </Badge>
                    )}
                </span>
            ),
        },
        {
            id: "working",
            header: "Working time",
            cell: ({ row }) => <LimitCell dimension="working" value={row.original.max_working_seconds} />,
        },
        {
            id: "driving",
            header: "Driving time",
            cell: ({ row }) => <LimitCell dimension="driving" value={row.original.max_driving_seconds} />,
        },
        {
            id: "distance",
            header: "Distance",
            cell: ({ row }) => <LimitCell dimension="distance" value={row.original.max_distance_m} />,
        },
        {
            id: "stops",
            header: "Stops",
            cell: ({ row }) => <LimitCell dimension="stops" value={row.original.max_stops} />,
        },
        {
            id: "drivers",
            header: "Drivers",
            cell: ({ row }) => <span>{driverCounts[row.original.id] ?? 0}</span>,
        },
        {
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => (
                // Without this the click bubbles to the row and opens the profile.
                <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
                    {canEdit ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${row.original.name}`}
                            onClick={() => setPendingDelete(row.original)}
                        >
                            <Trash2 className="size-4 text-destructive" />
                        </Button>
                    ) : (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger render={<span className="inline-flex" />}>
                                    <Button variant="ghost" size="icon" disabled aria-label={`Delete ${row.original.name}`}>
                                        <Trash2 className="size-4 text-muted-foreground" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left">{permissionRequiredMessage(DRIVERS_UPDATE)}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            ),
        },
    ]

    return (
        <div className="space-y-3" data-testid="driving-limit-profiles-table">
            <DataTable
                data={pageProfiles}
                columns={columns}
                loading={false}
                pageSize={PAGE_SIZE}
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
                actions={(row) => router.push(`/orgs/${slug}/dashboard/fleet/driving-limits/${row.id}`)}
            />

            <AlertDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => {
                    if (!open && !isDeleting) setPendingDelete(null)
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{`Delete "${pendingDelete?.name ?? ""}"?`}</AlertDialogTitle>
                        <AlertDialogDescription data-testid="driving-limit-delete-description">
                            {pendingDelete
                                ? `${deleteConsequence(pendingDelete, driverCounts[pendingDelete.id] ?? 0, defaultProfileId)} Shifts that are already planned are not replanned because of this; the change applies the next time each one is planned.`
                                : ""}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={() => void handleConfirmDelete()}
                            data-testid="driving-limit-delete-confirm"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
