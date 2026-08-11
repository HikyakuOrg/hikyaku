"use client"

import { useState, useTransition } from "react"
import { format, parseISO } from "date-fns"
import { PlugsConnectedIcon } from "@phosphor-icons/react"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { revokeConnectedApp, type ConnectedApp } from "@/lib/actions/oauth"

// Mirrors the wording used on the consent screen (app/oauth/consent/page.tsx)
// so the app describes the same permission the same way in both places.
const SCOPE_LABELS: Record<string, string> = {
    openid: "Verify your identity",
    email: "View your email address",
    profile: "View your basic profile info",
    phone: "View your phone number",
}

export function ConnectedAppsList({ slug, apps }: { slug: string; apps: ConnectedApp[] }) {
    const [pendingApp, setPendingApp] = useState<ConnectedApp | null>(null)
    const [isRevoking, startRevoking] = useTransition()

    function confirmRevoke() {
        if (!pendingApp) return
        const app = pendingApp

        startRevoking(async () => {
            const error = await revokeConnectedApp(slug, app.clientId)
            if (error) {
                toast.error(error)
                return
            }
            setPendingApp(null)
            toast.success(`Revoked access for ${app.name}`)
        })
    }

    if (apps.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                    <PlugsConnectedIcon className="size-8 text-muted-foreground" />
                    <p className="text-sm font-medium">No connected apps</p>
                    <p className="text-sm text-muted-foreground">
                        Apps you authorise to use your hikyaku account will appear here.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <div className="space-y-4">
                {apps.map((app) => (
                    <Card key={app.clientId}>
                        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 gap-3">
                                {app.logoUri ? (
                                    <img
                                        src={app.logoUri}
                                        alt=""
                                        referrerPolicy="no-referrer"
                                        className="size-10 shrink-0 rounded-md object-contain"
                                    />
                                ) : (
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                                        <PlugsConnectedIcon className="size-5 text-muted-foreground" />
                                    </div>
                                )}
                                <div className="min-w-0 space-y-2">
                                    <div>
                                        <p className="font-medium">{app.name}</p>
                                        {app.uri && (
                                            <a
                                                href={app.uri}
                                                target="_blank"
                                                rel="noreferrer noopener"
                                                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                                            >
                                                {app.uri}
                                            </a>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Authorised {format(parseISO(app.grantedAt), "d MMM yyyy, h:mm a")}
                                    </p>
                                    {app.scopes.length > 0 && (
                                        <ul className="flex flex-col gap-1.5">
                                            {app.scopes.map((scope) => (
                                                <li
                                                    key={scope}
                                                    className="flex items-center gap-2 text-sm text-muted-foreground"
                                                >
                                                    <Badge variant="outline" className="shrink-0">
                                                        {scope}
                                                    </Badge>
                                                    {SCOPE_LABELS[scope] ?? scope}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                className="shrink-0 self-start text-destructive"
                                onClick={() => setPendingApp(app)}
                            >
                                Revoke
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <AlertDialog
                open={pendingApp !== null}
                onOpenChange={(open) => {
                    if (!open && !isRevoking) setPendingApp(null)
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Revoke access for {pendingApp?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This signs {pendingApp?.name} out of every active session and
                            invalidates its tokens. It will need your approval again before it
                            can access your account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={isRevoking}
                            onClick={confirmRevoke}
                        >
                            {isRevoking ? "Revoking…" : "Revoke access"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
