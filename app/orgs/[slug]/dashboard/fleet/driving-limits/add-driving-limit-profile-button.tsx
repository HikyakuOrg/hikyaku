"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DRIVERS_UPDATE, permissionRequiredMessage } from "@/lib/permissions"

/** `canEdit` is resolved server-side on the page; never re-checked from the browser. */
export function AddDrivingLimitProfileButton({ slug, canEdit }: { slug: string; canEdit: boolean }) {
    if (!canEdit) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                        <Button disabled data-testid="add-driving-limit-profile-button">
                            Add Profile
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{permissionRequiredMessage(DRIVERS_UPDATE)}</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <Button
            render={<Link href={`/orgs/${slug}/dashboard/fleet/driving-limits/add`} />}
            data-testid="add-driving-limit-profile-button"
        >
            Add Profile
        </Button>
    )
}
