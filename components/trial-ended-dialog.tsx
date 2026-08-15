"use client"

import { useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { TrialStatus } from "@/lib/actions/billing"
import { formatTrialEnd } from "@/lib/trial"

/**
 * Blocking notice shown once an organisation's 7-day trial has ended.
 *
 * `open` with no `onOpenChange` and `showCloseButton={false}` — the same
 * non-dismissible pattern as PendingInvitationsDialog. That is deliberate rather
 * than merely emphatic: hikyaku-api already answers 402 for every tenant-scoped
 * request from this org, so a dismissible dialog would hand back a dashboard
 * where nothing loads and no error explained why.
 *
 * There is no "Upgrade" action yet because there is no checkout to send the user
 * to. Offering a dead button would be worse than offering none; switching
 * organisation is the one thing that genuinely resolves the block today, since a
 * personal org carries no deadline.
 */
export function TrialEndedDialog({ trial }: { trial: TrialStatus }) {
    const router = useRouter()

    return (
        <Dialog open>
            <DialogContent showCloseButton={false} className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Your free trial has ended</DialogTitle>
                    <DialogDescription>
                        {trial.trialEndsAt
                            ? `This organisation's 7-day trial ended on ${formatTrialEnd(trial.trialEndsAt)}.`
                            : "This organisation's 7-day trial has ended."}{" "}
                        Billing isn&apos;t available yet — get in touch to keep using
                        Hikyaku with this organisation.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button variant="outline" onClick={() => router.push("/orgs")}>
                        Switch organisation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
