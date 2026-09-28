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
 * Shown after an organisation's 7-day trial ends. It cannot be closed: the API
 * refuses every request for this org. There is no upgrade button because there
 * is no checkout yet.
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
                        Billing is not available yet. Contact us to keep using Hikyaku with
                        this organisation.
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
