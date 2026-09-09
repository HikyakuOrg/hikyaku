"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { SERVICE_AREAS_EDIT, permissionRequiredMessage } from "@/lib/permissions"

type AddServiceAreaButtonProps = {
    slug: string
    /** Resolved server-side on the page; never re-checked from the browser. */
    canEdit: boolean
}

export function AddServiceAreaButton({ slug, canEdit }: AddServiceAreaButtonProps) {
    if (!canEdit) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                        <Button disabled data-testid="add-service-area-button">
                            Add Service Area
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        {permissionRequiredMessage(SERVICE_AREAS_EDIT)}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <Button render={<Link href={`/orgs/${slug}/dashboard/service/areas/add`} />} data-testid="add-service-area-button">
            Add Service Area
        </Button>
    )
}
