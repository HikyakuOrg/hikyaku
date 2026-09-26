"use client"

import { useMemo } from "react"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { format, isValid, parseISO } from "date-fns"
import { Trash2 } from "lucide-react"

import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useHydrated } from "@/hooks/use-hydrated"
import { SERVICE_AREAS_EDIT, permissionRequiredMessage } from "@/lib/permissions"
import type { ServiceAreaListItem } from "@/lib/supabase/db-server"

/**
 * Rows per page. Exported because picking an area on the map has to page the
 * list to wherever that area is listed, and that happens where the two are wired
 * together rather than in here.
 */
export const SERVICE_AREAS_PAGE_SIZE = 10

type ServiceAreasTableProps = {
    areas: ServiceAreaListItem[]
    /** Shared with the map, so a polygon click ticks the matching row. */
    selectedAreaIds: string[]
    page: number
    onPageChange: (page: number) => void
    /**
     * Whether the signed-in user holds `service_areas.edit`. Resolved server-side
     * by the page and passed down. UI gating only: the RLS policies on
     * `service_areas` are what actually refuse the delete.
     */
    canEdit: boolean
    /** The full set of ticked ids, in list order. */
    onSelectionChange: (ids: string[]) => void
    onOpenArea: (area: ServiceAreaListItem) => void
    onRequestDelete: (area: ServiceAreaListItem) => void
}

/**
 * The calendar day depends on the viewer's time zone, which the server cannot
 * know, so the date is only written once hydrated. Formatting on the server too
 * would let the two disagree near midnight and fail hydration, which also
 * drops the row click handlers.
 */
function CreatedAt({ value }: { value: string }) {
    const hydrated = useHydrated()
    const created = parseISO(value)

    if (!isValid(created)) {
        return <span className="text-muted-foreground">Unknown</span>
    }

    return (
        <time dateTime={value} className="text-muted-foreground">
            {hydrated ? format(created, "d MMM yyyy") : null}
        </time>
    )
}

function DeleteServiceAreaButton({
    area,
    canEdit,
    onRequestDelete,
}: {
    area: ServiceAreaListItem
    canEdit: boolean
    onRequestDelete: (area: ServiceAreaListItem) => void
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
                            aria-label={`Delete ${area.name}`}
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
            aria-label={`Delete ${area.name}`}
            onClick={() => onRequestDelete(area)}
        >
            <Trash2 className="size-4 text-destructive" />
        </Button>
    )
}

export function ServiceAreasTable({
    areas,
    selectedAreaIds,
    page,
    onPageChange,
    canEdit,
    onSelectionChange,
    onOpenArea,
    onRequestDelete,
}: ServiceAreasTableProps) {
    const totalPages = Math.max(1, Math.ceil(areas.length / SERVICE_AREAS_PAGE_SIZE))
    // Deleting the last row of the last page leaves the page number past the end.
    const currentPage = Math.min(page, totalPages)
    const pageAreas = areas.slice(
        (currentPage - 1) * SERVICE_AREAS_PAGE_SIZE,
        currentPage * SERVICE_AREAS_PAGE_SIZE
    )

    const rowSelection = useMemo<RowSelectionState>(
        () => Object.fromEntries(selectedAreaIds.map((id) => [id, true])),
        [selectedAreaIds]
    )

    // The table's selection is "which areas the map is highlighting". Rows on
    // other pages stay ticked, since TanStack only sees the current page.
    const handleRowSelectionChange: React.Dispatch<React.SetStateAction<RowSelectionState>> = (updater) => {
        const next = typeof updater === "function" ? updater(rowSelection) : updater

        onSelectionChange(areas.filter((area) => next[area.id]).map((area) => area.id))
    }

    const columns: ColumnDef<ServiceAreaListItem>[] = [
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        },
        {
            accessorKey: "created_at",
            header: "Created",
            cell: ({ row }) => <CreatedAt value={row.original.created_at} />,
        },
        {
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => (
                // Same guard the selection checkbox uses: without it the click
                // bubbles to the row and navigates away from the dialog.
                <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
                    <DeleteServiceAreaButton
                        area={row.original}
                        canEdit={canEdit}
                        onRequestDelete={onRequestDelete}
                    />
                </div>
            ),
        },
    ]

    return (
        <div className="space-y-3" data-testid="service-areas-table">
            <div>
                <h2 className="text-lg font-semibold tracking-tight">All service areas</h2>
                <p className="text-sm text-muted-foreground">
                    Every area in this organisation, including any drawn outside the current map view.
                    Tick areas to highlight them on the map, or open a row to see and change who covers it.
                </p>
            </div>

            <DataTable
                data={pageAreas}
                columns={columns}
                loading={false}
                pageSize={SERVICE_AREAS_PAGE_SIZE}
                page={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
                rowSelection={rowSelection}
                onRowSelectionChange={handleRowSelectionChange}
                actions={(row) => onOpenArea(row)}
            />
        </div>
    )
}
