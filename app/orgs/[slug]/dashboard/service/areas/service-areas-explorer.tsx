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

/** Holds the state the map and the list share: selection, camera and deletes. */
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

    // Open the area's detail page. The boundary editor opens from there.
    const openArea = (id: string) => {
        router.push(`/orgs/${slug}/dashboard/service/areas/${id}`)
    }

    // Ticking in the list moves the map to the new areas. Unticking and map
    // clicks do not move it.
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

        // Go to the list page that shows the clicked area.
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
            // Wait for the result: RLS can refuse the write without an error.
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
                // The map caches viewports, so tell it to reload.
                setMapRefreshToken((current) => current + 1)
                toast.success(
                    retiredIds.length === 1
                        ? `"${requested.find((area) => area.id === retiredIds[0])?.name}" deleted.`
                        : `${retiredIds.length} service areas deleted.`
                )
                // The server decides the empty state.
                router.refresh()
            }

            if (missedCount > 0) {
                // Zero rows: already deleted, or the permission was removed.
                toast.error(
                    missedCount === 1
                        ? `1 service area was not deleted. Someone may have deleted it, or you no longer have the "${SERVICE_AREAS_EDIT}" permission. Reload the page and try again.`
                        : `${missedCount} service areas were not deleted. Someone may have deleted them, or you no longer have the "${SERVICE_AREAS_EDIT}" permission. Reload the page and try again.`
                )
            }

            setPendingDeleteAreas([])
        } catch (error) {
            console.error(error)
            toast.error(describeWriteError(error, SERVICE_AREAS_EDIT, "Could not delete the service areas."))
        } finally {
            setIsDeleting(false)
        }
    }

    const singlePendingName = pendingDeleteAreas.length === 1 ? pendingDeleteAreas[0].name : null
    const deleteTitle = singlePendingName !== null
        ? `Delete "${singlePendingName}"?`
        : `Delete ${pendingDeleteAreas.length} service areas?`
    const deleteSubject = singlePendingName !== null ? `"${singlePendingName}"` : "These areas"

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
                            {`${deleteSubject} will be removed from the map and this list. Packages that are already booked do not change.`}
                        </AlertDialogDescription>
                        {singlePendingName === null ? (
                            // Name every area: some can be on other pages.
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
