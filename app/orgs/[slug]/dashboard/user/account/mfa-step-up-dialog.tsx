"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { MfaChallenge } from "@/components/mfa-challenge"

/**
 * Removing an already-verified factor requires the session to be at aal2.
 * This is the same challenge UI as the login-time /auth/mfa page, just in a
 * Dialog instead of a full page — opened before a removal is allowed to go
 * through when the current session hasn't stepped up yet.
 */
export function MfaStepUpDialog({
    open,
    onOpenChange,
    onVerified,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onVerified: () => void
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Verify it&apos;s you</DialogTitle>
                    <DialogDescription>
                        Confirm a two-factor method before you can manage your account&apos;s
                        two-factor settings.
                    </DialogDescription>
                </DialogHeader>
                <MfaChallenge onVerified={onVerified} />
            </DialogContent>
        </Dialog>
    )
}
