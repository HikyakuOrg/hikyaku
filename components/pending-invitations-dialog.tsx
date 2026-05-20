"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    acceptInvitation,
    declineInvitation,
    type PendingInvitation,
} from "@/lib/actions/invitations"
import { tenantUrl } from "@/lib/subdomain"

interface PendingInvitationsDialogProps {
    invitations: PendingInvitation[]
}

export function PendingInvitationsDialog({ invitations }: PendingInvitationsDialogProps) {
    const router = useRouter()
    const [pending, setPending] = useState<PendingInvitation[]>(invitations)
    const [busyId, setBusyId] = useState<string | null>(null)
    const [, startTransition] = useTransition()

    if (pending.length === 0) return null

    function handleAccept(invitation: PendingInvitation) {
        setBusyId(invitation.id)
        startTransition(async () => {
            const result = await acceptInvitation(invitation.id)
            if (!result.success) {
                toast.error(result.error)
                setBusyId(null)
                return
            }
            toast.success(`Joined ${invitation.organisation.name}`)
            // Cross-subdomain — hard navigation so the new x-org-slug header is
            // attached on the very next request.
            window.location.href = tenantUrl(invitation.organisation.slug, "/dashboard")
        })
    }

    function handleDecline(invitation: PendingInvitation) {
        setBusyId(invitation.id)
        startTransition(async () => {
            const result = await declineInvitation(invitation.id)
            if (!result.success) {
                toast.error(result.error)
                setBusyId(null)
                return
            }
            setPending((prev) => prev.filter((i) => i.id !== invitation.id))
            setBusyId(null)
            router.refresh()
        })
    }

    return (
        <Dialog open>
            <DialogContent showCloseButton={false} className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {pending.length === 1
                            ? "You have an invitation"
                            : `You have ${pending.length} invitations`}
                    </DialogTitle>
                    <DialogDescription>
                        Accept to join the organisation. You can decline if you don&apos;t
                        recognise it.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3">
                    {pending.map((invitation, idx) => (
                        <div key={invitation.id}>
                            {idx > 0 && <Separator className="mb-3" />}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-baseline justify-between gap-3">
                                    <div className="font-medium">{invitation.organisation.name}</div>
                                    <Badge variant="secondary">{invitation.role}</Badge>
                                </div>
                                {invitation.permissions.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {invitation.permissions.map((perm) => (
                                            <Badge
                                                key={perm}
                                                variant="outline"
                                                className="text-xs font-normal"
                                            >
                                                {perm}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                <DialogFooter className="mt-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={busyId === invitation.id}
                                        onClick={() => handleDecline(invitation)}
                                    >
                                        Decline
                                    </Button>
                                    <Button
                                        size="sm"
                                        disabled={busyId === invitation.id}
                                        onClick={() => handleAccept(invitation)}
                                    >
                                        {busyId === invitation.id ? "Joining…" : "Accept"}
                                    </Button>
                                </DialogFooter>
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
