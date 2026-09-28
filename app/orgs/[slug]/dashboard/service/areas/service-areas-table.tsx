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

/** Rows per page. Exported so a map click can go to the correct page. */
export const SERVICE_AREAS_PAGE_SIZE = 10

type ServiceAreasTableProps = {
    areas: ServiceAreaListItem[]
    /** Shared with the map, so a polygon click ticks the matching row. */
    selectedAreaIds: string[]
    page: number
    onPageChange: (page: number) => void
    /** Whether the user has `service_areas.edit`. For the UI only; RLS enforces it. */
    canEdit: boolean
    /** The full set of ticked ids, in list order. */
    onSelectionChange: (ids: string[]) => void
    onOpenArea: (area: ServiceAreaListItem) => void
    /** Asks to delete every ticked area, including ones on other pages. */
    onRequestDelete: (areas: ServiceAreaListItem[]) => void
}

/** Shows the date only after hydration: the server does not know the viewer's time zone. */
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

function DeleteSelectedButton({
    count,
    canEdit,
    onClick,
}: {
    count: number
    canEdit: boolean
    onClick: () => void
}) {
    const label = count > 0 ? `Delete selected (${count})` : "Delete selected"

    if (!canEdit) {
        // Disabled with the reason, so users know the action exists.
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                        <Button variant="outline" disabled data-testid="service-areas-delete-selected">
                            <Trash2 className="size-4" />
                            {label}
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
            variant="destructive"
            disabled={count === 0}
            onClick={onClick}
            data-testid="service-areas-delete-selected"
        >
            <Trash2 className="size-4" />
            {label}
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

    // In list order, so the confirmation names them the way the list does.
    const selectedAreas = useMemo(
        () => areas.filter((area) => selectedAreaIds.includes(area.id)),
        [areas, selectedAreaIds]
    )

    const rowSelection = useMemo<RowSelectionState>(
        () => Object.fromEntries(selectedAreaIds.map((id) => [id, true])),
        [selectedAreaIds]
    )

    // Selection is shared with the map. Rows on other pages stay ticked.
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
    ]

    return (
        <div className="space-y-3" data-testid="service-areas-table">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight">All service areas</h2>
                    <p className="text-sm text-muted-foreground">
                        All areas in this organisation, also those outside the map view. Tick areas to
                        show them on the map or to delete them. Open a row to see its drivers.
                    </p>
                </div>

                <DeleteSelectedButton
                    count={selectedAreas.length}
                    canEdit={canEdit}
                    onClick={() => onRequestDelete(selectedAreas)}
                />
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
