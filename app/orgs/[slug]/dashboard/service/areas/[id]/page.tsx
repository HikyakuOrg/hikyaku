import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SERVICE_AREAS_EDIT } from "@/lib/permissions"
import { getServiceAreaDetail } from "@/lib/supabase/db-server"
import { hasOrgPermission } from "@/lib/supabase/server"

import { ServiceAreaDriversCard } from "./service-area-drivers-card"
import { ServiceAreaMapPreview } from "./service-area-map-preview"

export default async function ServiceAreaDetailPage({
    params,
}: {
    params: Promise<{ slug: string; id: string }>
}) {
    const { slug, id } = await params
    // Same shape as the list page: looking at an area stays open to every org
    // member, only the write entry points are gated, and the permission is
    // resolved once here rather than by each control asking for itself.
    const [areaResult, canEdit] = await Promise.all([
        getServiceAreaDetail(id),
        hasOrgPermission(slug, SERVICE_AREAS_EDIT),
    ])

    const areasHref = `/orgs/${slug}/dashboard/service/areas`

    if (areaResult.status !== "ok") {
        // A missing area and a failed read get different panels. Telling a
        // dispatcher their territory is gone when the database is simply
        // unreachable sends them off to redraw something that still exists.
        const isMissing = areaResult.status === "not-found"

        return (
            <div className="space-y-6 p-6">
                <Button variant="ghost" size="sm" render={<Link href={areasHref} />}>
                    <ChevronLeft className="size-4" />
                    All service areas
                </Button>

                <div
                    className="flex h-[320px] w-full items-center justify-center rounded-xl border border-destructive/40 bg-destructive/5 px-6 text-center"
                    data-testid={isMissing ? "service-area-not-found" : "service-area-read-error"}
                >
                    <div className="space-y-2">
                        <h1 className="text-lg font-semibold">
                            {isMissing ? "Service area not found" : "Service area could not be loaded"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isMissing
                                ? "It may have been deleted, or it may belong to another organisation."
                                : "This is a problem reading it, not a deleted area. Reload the page, and contact support if it keeps happening."}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const { area } = areaResult

    return (
        <div className="space-y-6 p-6">
            <Button variant="ghost" size="sm" render={<Link href={areasHref} />}>
                <ChevronLeft className="size-4" />
                All service areas
            </Button>

            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="mb-2 text-3xl font-bold tracking-tight" data-testid="service-area-detail-name">
                        {area.name}
                    </h1>
                    <p className="text-muted-foreground">
                        The territory this area covers, and the drivers who cover it.
                    </p>
                </div>

                {/*
                    Redrawing the boundary lives on the existing edit route and
                    stays there. That page is readable without the permission
                    too, so this is a link either way and only the label changes.
                */}
                <Button
                    variant="outline"
                    render={<Link href={`${areasHref}/edit/${area.id}`} />}
                    data-testid="service-area-edit-link"
                >
                    {canEdit ? "Edit boundary" : "View boundary"}
                </Button>
            </div>

            <ServiceAreaMapPreview
                areaName={area.name}
                featureCollection={area.featureCollection}
                bounds={area.bounds}
            />

            <ServiceAreaDriversCard
                serviceAreaId={area.id}
                serviceAreaName={area.name}
                canEdit={canEdit}
            />
        </div>
    )
}
