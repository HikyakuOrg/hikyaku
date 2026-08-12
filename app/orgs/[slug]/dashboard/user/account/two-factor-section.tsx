"use client"

import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"
import { DeviceMobileIcon, KeyIcon } from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { isWebAuthnMfaEnabled, isWebAuthnSupported } from "@/lib/auth/webauthn-mfa"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MfaStepUpDialog } from "./mfa-step-up-dialog"
import { TotpEnrollDialog } from "./totp-enroll-dialog"
import { WebauthnEnrollDialog } from "./webauthn-enroll-dialog"

type FactorRow = {
    id: string
    friendlyName: string
    type: "totp" | "webauthn"
    createdAt: string
}

type Aal = { currentLevel: string | null; nextLevel: string | null }

export function TwoFactorSection() {
    const [rows, setRows] = useState<FactorRow[] | null>(null)
    const [aal, setAal] = useState<Aal | null>(null)
    const [showTotpDialog, setShowTotpDialog] = useState(false)
    const [showWebauthnDialog, setShowWebauthnDialog] = useState(false)
    const [showStepUpDialog, setShowStepUpDialog] = useState(false)
    const [pendingRemoval, setPendingRemoval] = useState<FactorRow | null>(null)
    const [isRemoving, setIsRemoving] = useState(false)

    // Pure fetch + transform, no setState — kept separate so the mount effect
    // below can set state from its own inline .then() (what react-hooks/
    // set-state-in-effect wants) while refresh() below stays reusable for
    // event handlers, which aren't subject to that rule.
    async function fetchTwoFactorState(): Promise<{ rows: FactorRow[]; aal: Aal | null }> {
        const supabase = createClient()
        const [{ data: factorsData }, { data: aalData }] = await Promise.all([
            supabase.auth.mfa.listFactors(),
            supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        ])

        const rows: FactorRow[] = factorsData
            ? [
                  ...factorsData.totp.map((f) => ({
                      id: f.id,
                      friendlyName: f.friendly_name || "Authenticator app",
                      type: "totp" as const,
                      createdAt: f.created_at,
                  })),
                  ...factorsData.webauthn.map((f) => ({
                      id: f.id,
                      friendlyName: f.friendly_name || "Security key",
                      type: "webauthn" as const,
                      createdAt: f.created_at,
                  })),
              ]
            : []

        return { rows, aal: aalData ?? null }
    }

    async function refresh() {
        const { rows, aal } = await fetchTwoFactorState()
        setRows(rows)
        setAal(aal)
    }

    useEffect(() => {
        fetchTwoFactorState().then(({ rows, aal }) => {
            setRows(rows)
            setAal(aal)
        })
        // Runs once on mount; refresh() (used by event handlers below) is what
        // re-fetches after a mutation.
    }, [])

    function handleRemoveClick(row: FactorRow) {
        setPendingRemoval(row)
        if (aal?.currentLevel !== "aal2") {
            setShowStepUpDialog(true)
        }
    }

    function handleStepUpOpenChange(next: boolean) {
        setShowStepUpDialog(next)
        // Closed without completing the challenge — abandon the removal too.
        if (!next) setPendingRemoval(null)
    }

    function handleStepUpVerified() {
        setAal((prev) => (prev ? { ...prev, currentLevel: "aal2" } : prev))
        setShowStepUpDialog(false)
    }

    async function confirmRemoval() {
        if (!pendingRemoval) return
        const supabase = createClient()
        setIsRemoving(true)

        const { error } = await supabase.auth.mfa.unenroll({ factorId: pendingRemoval.id })
        setIsRemoving(false)

        if (error) {
            // Most likely the session wasn't actually at aal2 (a stale local read) —
            // Supabase enforces this server-side regardless of what we believe here.
            setShowStepUpDialog(true)
            return
        }

        toast.success(`Removed ${pendingRemoval.friendlyName}`)
        setPendingRemoval(null)
        refresh()
    }

    const needsStepUpNote =
        rows && rows.length > 0 && aal?.currentLevel !== null && aal?.currentLevel !== "aal2"

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                    <CardDescription>
                        Add a security key or an authenticator app for a second step at sign-in.
                        Optional — nothing changes until you add one.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {rows === null ? (
                        <p className="text-muted-foreground text-sm">Loading…</p>
                    ) : rows.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No two-factor methods added yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {needsStepUpNote && (
                                <p className="text-muted-foreground text-sm">
                                    Verify your identity to remove a method on this device.
                                </p>
                            )}
                            {rows.map((row) => (
                                <div
                                    key={row.id}
                                    className="flex items-center justify-between gap-4 rounded-lg border p-3"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        {row.type === "totp" ? (
                                            <DeviceMobileIcon className="text-muted-foreground size-5 shrink-0" />
                                        ) : (
                                            <KeyIcon className="text-muted-foreground size-5 shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{row.friendlyName}</p>
                                            <p className="text-muted-foreground text-sm">
                                                Added {format(parseISO(row.createdAt), "d MMM yyyy")}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive shrink-0"
                                        onClick={() => handleRemoveClick(row)}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setShowTotpDialog(true)}>
                            Add authenticator app
                        </Button>
                        {isWebAuthnMfaEnabled && isWebAuthnSupported() && (
                            <Button type="button" variant="outline" onClick={() => setShowWebauthnDialog(true)}>
                                Add security key
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <TotpEnrollDialog open={showTotpDialog} onOpenChange={setShowTotpDialog} onEnrolled={refresh} />
            <WebauthnEnrollDialog
                open={showWebauthnDialog}
                onOpenChange={setShowWebauthnDialog}
                onEnrolled={refresh}
            />
            <MfaStepUpDialog
                open={showStepUpDialog}
                onOpenChange={handleStepUpOpenChange}
                onVerified={handleStepUpVerified}
            />

            <AlertDialog
                open={pendingRemoval !== null && !showStepUpDialog}
                onOpenChange={(open) => {
                    if (!open && !isRemoving) setPendingRemoval(null)
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove {pendingRemoval?.friendlyName}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You&apos;ll no longer be asked for this method at sign-in. You can add it again
                            later.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={isRemoving}
                            onClick={confirmRemoval}
                        >
                            {isRemoving ? "Removing…" : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
