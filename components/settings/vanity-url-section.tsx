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

/** Shows the org's vanity booking URL. A DB trigger sets it from the org name; it cannot be edited. */
export function VanityUrlSection({
    vanityUrl,
    hasVanityUrlEntitlement,
}: {
    /** The full booking URL, or null when the org name gives no vanity slug. */
    vanityUrl: string | null
    hasVanityUrlEntitlement: boolean
}) {
    // No vanity slug, so nothing to show.
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
