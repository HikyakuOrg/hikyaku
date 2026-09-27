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
import { getServiceAreaListBounds, type ServiceAreaBounds } from "@/lib/maps/service-area-geometry"
import { SERVICE_AREAS_EDIT, describeWriteError } from "@/lib/permissions"
import { deleteServiceAreas } from "@/lib/supabase/db"
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
 * Owns the state the map and the list share: which areas are picked, where the
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
    const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([])
    const [focusRequest, setFocusRequest] = useState<ServiceAreaFocusRequest | null>(null)
    const [mapRefreshToken, setMapRefreshToken] = useState(0)
    const [page, setPage] = useState(1)
    const [pendingDeleteAreas, setPendingDeleteAreas] = useState<ServiceAreaListItem[]>([])
    const [isDeleting, setIsDeleting] = useState(false)

    // Both surfaces open the area's detail page, where its coverage is staffed.
    // Redrawing the boundary is a separate route reached from there, because
    // "who covers this" is the question somebody has when they open an area, and
    // dropping them straight into a drawing tool answered a different one.
    const openArea = (id: string) => {
        router.push(`/orgs/${slug}/dashboard/service/areas/${id}`)
    }

    // Ticking in the list also moves the camera onto what was just ticked, since
    // it is usually not on screen. Unticking leaves the view alone, and so does
    // picking on the map: that area is already in view.
    const handleSelectFromTable = (ids: string[]) => {
        const addedAreas = areas.filter((area) => ids.includes(area.id) && !selectedAreaIds.includes(area.id))

        setSelectedAreaIds(ids)

        const bounds = getServiceAreaListBounds(addedAreas)
        if (bounds) {
            setFocusRequest({ bounds, token: Date.now() })
        }
    }

    const handleSelectFromMap = (id: string) => {
        setSelectedAreaIds((current) => (current.includes(id) ? current : [...current, id]))

        // Follow the pick into the list. The polygon that was clicked can be
        // listed on a page nobody is looking at, and seeing which row it is is
        // the whole point of highlighting it.
        const index = areas.findIndex((area) => area.id === id)
        if (index >= 0) {
            setPage(Math.floor(index / SERVICE_AREAS_PAGE_SIZE) + 1)
        }
    }

    const handleConfirmDelete = async () => {
        const requested = pendingDeleteAreas

        if (requested.length === 0) {
            return
        }

        setIsDeleting(true)

        try {
            // Awaited before anything else happens. Dropping the rows first and
            // reporting success alongside the request would report a refused
            // write as a success and leave the list disagreeing with the table.
            const retiredIds = await deleteServiceAreas(requested.map((area) => area.id))
            const missedCount = requested.length - retiredIds.length

            if (retiredIds.length > 0) {
                const remainingAreas = areas.filter((candidate) => !retiredIds.includes(candidate.id))
                setAreas(remainingAreas)
                setSelectedAreaIds((current) => current.filter((id) => !retiredIds.includes(id)))
                setPage((current) => Math.min(
                    current,
                    Math.max(1, Math.ceil(remainingAreas.length / SERVICE_AREAS_PAGE_SIZE))
                ))
                // The map serves a viewport it has already fetched from cache, so
                // ask it to re-read or the retired polygons stay drawn.
                setMapRefreshToken((current) => current + 1)
                toast.success(
                    retiredIds.length === 1
                        ? `"${requested.find((area) => area.id === retiredIds[0])?.name}" deleted.`
                        : `${retiredIds.length} service areas deleted.`
                )
                // The empty state is decided server-side, so let the page re-read
                // now that these rows are retired.
                router.refresh()
            }

            if (missedCount > 0) {
                // A refused UPDATE matches zero rows instead of raising, so the
                // shortfall is ambiguous: already removed, or out of reach. Say
                // both rather than assert the wrong one.
                toast.error(
                    missedCount === 1
                        ? `1 service area was not deleted. It may already have been removed, or your "${SERVICE_AREAS_EDIT}" permission may have been revoked. Reload the page and try again.`
                        : `${missedCount} service areas were not deleted. They may already have been removed, or your "${SERVICE_AREAS_EDIT}" permission may have been revoked. Reload the page and try again.`
                )
            }

            setPendingDeleteAreas([])
        } catch (error) {
            console.error(error)
            // Hiding the control is UX; RLS is the boundary, and it can still
            // refuse a write (a permission revoked after this page rendered), so
            // translate the PostgREST code rather than show the raw string.
            toast.error(describeWriteError(error, SERVICE_AREAS_EDIT, "Failed to delete the service areas."))
        } finally {
            setIsDeleting(false)
        }
    }

    const singlePendingName = pendingDeleteAreas.length === 1 ? pendingDeleteAreas[0].name : null
    const deleteTitle = singlePendingName !== null
        ? `Delete "${singlePendingName}"?`
        : `Delete ${pendingDeleteAreas.length} service areas?`
    const deleteSubject = singlePendingName !== null ? `"${singlePendingName}"` : "These areas"
    const deleteVerb = singlePendingName !== null ? "stops" : "stop"

    return (
        <div className="space-y-6">
            <ServiceAreasMap
                initialBounds={initialBounds}
                selectedAreaIds={selectedAreaIds}
                focusRequest={focusRequest}
                onSelectArea={handleSelectFromMap}
                onOpenArea={openArea}
                refreshToken={mapRefreshToken}
            />

            <ServiceAreasTable
                areas={areas}
                selectedAreaIds={selectedAreaIds}
                page={page}
                onPageChange={setPage}
                canEdit={canEdit}
                onSelectionChange={handleSelectFromTable}
                onOpenArea={(area) => openArea(area.id)}
                onRequestDelete={setPendingDeleteAreas}
            />

            <AlertDialog
                open={pendingDeleteAreas.length > 0}
                onOpenChange={(open) => {
                    if (!open && !isDeleting) {
                        setPendingDeleteAreas([])
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle data-testid="service-area-delete-confirmation-title">
                            {deleteTitle}
                        </AlertDialogTitle>
                        <AlertDialogDescription data-testid="service-area-delete-confirmation-description">
                            {`${deleteSubject} ${deleteVerb} appearing on your coverage map and in this list. Packages that have already been booked keep the coverage they were created with, so work in progress is unaffected.`}
                        </AlertDialogDescription>
                        {singlePendingName === null ? (
                            // Naming every area is the safeguard: ticked rows can sit
                            // on pages nobody is looking at.
                            <ul
                                className="max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-sm"
                                data-testid="service-area-delete-confirmation-list"
                            >
                                {pendingDeleteAreas.map((area) => (
                                    <li key={area.id}>{area.name}</li>
                                ))}
                            </ul>
                        ) : null}
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
