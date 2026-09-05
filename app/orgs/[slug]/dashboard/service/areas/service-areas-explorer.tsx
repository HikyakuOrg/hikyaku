"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import type { ServiceAreaBounds } from "@/lib/maps/service-area-geometry"
import { SERVICE_AREAS_EDIT, describeWriteError } from "@/lib/permissions"
import { deleteServiceArea } from "@/lib/supabase/db"
import type { ServiceAreaListItem } from "@/lib/supabase/db-server"

import { ServiceAreasMap, type ServiceAreaFocusRequest } from "./service-areas-map"
import { SERVICE_AREAS_PAGE_SIZE, ServiceAreasTable } from "./service-areas-table"

type ServiceAreasExplorerProps = {
    slug: string
    initialAreas: ServiceAreaListItem[]
    initialBounds: ServiceAreaBounds | null
    canEdit: boolean
}

/**
 * Owns the state the map and the list share: which area is picked, where the
 * camera should go, and what a delete has already removed. Neither of the two
 * can hold it, so it sits in the one component that renders both.
 */
export function ServiceAreasExplorer({
    slug,
    initialAreas,
    initialBounds,
    canEdit,
}: ServiceAreasExplorerProps) {
    const router = useRouter()
    const [areas, setAreas] = useState(initialAreas)
    const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
    const [focusRequest, setFocusRequest] = useState<ServiceAreaFocusRequest | null>(null)
    const [mapRefreshToken, setMapRefreshToken] = useState(0)
    const [page, setPage] = useState(1)
    const [pendingDeleteArea, setPendingDeleteArea] = useState<ServiceAreaListItem | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Both surfaces open the area's detail page, where its coverage is staffed.
    // Redrawing the boundary is a separate route reached from there, because
    // "who covers this" is the question somebody has when they open an area, and
    // dropping them straight into a drawing tool answered a different one.
    const openArea = (id: string) => {
        router.push(`/orgs/${slug}/dashboard/service/areas/${id}`)
    }

    // Picking from the list also moves the camera, since the area is usually not
    // the one on screen. Picking on the map does not: it is already in view.
    const handleSelectFromTable = (area: ServiceAreaListItem | null) => {
        setSelectedAreaId(area?.id ?? null)

        if (area?.bounds) {
            setFocusRequest({ bounds: area.bounds, token: Date.now() })
        }
    }

    const handleSelectFromMap = (id: string) => {
        setSelectedAreaId(id)

        // Follow the pick into the list. The polygon that was clicked can be
        // listed on a page nobody is looking at, and seeing which row it is is
        // the whole point of highlighting it.
        const index = areas.findIndex((area) => area.id === id)
        if (index >= 0) {
            setPage(Math.floor(index / SERVICE_AREAS_PAGE_SIZE) + 1)
        }
    }

    const handleConfirmDelete = async () => {
        const area = pendingDeleteArea

        if (!area) {
            return
        }

        setIsDeleting(true)

        try {
            // Awaited before anything else happens. Dropping the row first and
            // reporting success alongside the request would report a refused
            // write as a success and leave the list disagreeing with the table.
            await deleteServiceArea(area.id)

            const remainingAreas = areas.filter((candidate) => candidate.id !== area.id)
            setAreas(remainingAreas)
            setSelectedAreaId((current) => (current === area.id ? null : current))
            setPage((current) => Math.min(
                current,
                Math.max(1, Math.ceil(remainingAreas.length / SERVICE_AREAS_PAGE_SIZE))
            ))
            // The map serves a viewport it has already fetched from cache, so
            // ask it to re-read or the retired polygon stays drawn.
            setMapRefreshToken((current) => current + 1)
            setPendingDeleteArea(null)
            toast.success(`"${area.name}" deleted.`)
            // The empty state is decided server-side, so let the page re-read now
            // that this row is retired.
            router.refresh()
        } catch (error) {
            console.error(error)
            // Hiding the control is UX; RLS is the boundary, and it can still
            // refuse a write (a permission revoked after this page rendered), so
            // translate the PostgREST code rather than show the raw string.
            toast.error(describeWriteError(error, SERVICE_AREAS_EDIT, "Failed to delete the service area."))
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="space-y-6">
            <ServiceAreasMap
                initialBounds={initialBounds}
                selectedAreaId={selectedAreaId}
                focusRequest={focusRequest}
                onSelectArea={handleSelectFromMap}
                onOpenArea={openArea}
                refreshToken={mapRefreshToken}
            />

            <ServiceAreasTable
                areas={areas}
                selectedAreaId={selectedAreaId}
                page={page}
                onPageChange={setPage}
                canEdit={canEdit}
                onSelectArea={handleSelectFromTable}
                onOpenArea={(area) => openArea(area.id)}
                onRequestDelete={setPendingDeleteArea}
            />

            <AlertDialog
                open={pendingDeleteArea !== null}
                onOpenChange={(open) => {
                    if (!open && !isDeleting) {
                        setPendingDeleteArea(null)
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle data-testid="service-area-delete-confirmation-title">
                            {`Delete "${pendingDeleteArea?.name ?? ""}"?`}
                        </AlertDialogTitle>
                        <AlertDialogDescription data-testid="service-area-delete-confirmation-description">
                            {`"${pendingDeleteArea?.name ?? ""}" stops appearing on your coverage map and in this list. Packages that have already been booked keep the coverage they were created with, so work in progress is unaffected.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            disabled={isDeleting}
                            data-testid="service-area-delete-confirmation-cancel"
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={() => {
                                void handleConfirmDelete()
                            }}
                            data-testid="service-area-delete-confirmation-ok"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
