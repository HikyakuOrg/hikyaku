"use client"

import { Globe, Lock } from "lucide-react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { CopyButton } from "@/components/copy-button"

/**
 * Read-only display of a company org's vanity booking URL. The value itself
 * is derived automatically from the org's name (set_organisation_vanity_slug
 * in hikyaku-api) — this section only ever shows current state, it does not
 * offer a way to edit it.
 */
export function VanityUrlSection({
    vanityUrl,
    hasVanityUrlEntitlement,
}: {
    /** Full https://<vanity>.hikyaku.org/booking URL, or null if the org's
     *  name has no sluggable characters. */
    vanityUrl: string | null
    hasVanityUrlEntitlement: boolean
}) {
    // Nothing to show for a name that produced no vanity slug at all.
    if (!vanityUrl) return null

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    {hasVanityUrlEntitlement ? (
                        <Globe className="h-5 w-5 text-green-600" />
                    ) : (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                    <CardTitle>Vanity booking URL</CardTitle>
                </div>
                <CardDescription>
                    {hasVanityUrlEntitlement
                        ? "Share this link with customers instead of your default booking link."
                        : "Included with the Organisation plan. Upgrade or renew your subscription to activate this link."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {hasVanityUrlEntitlement ? (
                    <CopyButton value={vanityUrl} label="Copy booking link" />
                ) : (
                    <span className="inline-flex items-center rounded-md border bg-muted px-2.5 py-1 font-mono text-sm text-muted-foreground">
                        {vanityUrl}
                    </span>
                )}
            </CardContent>
        </Card>
    )
}
