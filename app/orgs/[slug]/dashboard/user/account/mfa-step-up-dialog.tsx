"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { MfaChallenge } from "@/components/mfa-challenge"

/** Removing a verified factor needs aal2. Shows the /auth/mfa challenge in a dialog. */
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
                        Use a two-factor method to confirm it is you.
                    </DialogDescription>
                </DialogHeader>
                <MfaChallenge onVerified={onVerified} />
            </DialogContent>
        </Dialog>
    )
}
