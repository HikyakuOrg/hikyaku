"use client"

import { useState } from "react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { friendlyWebAuthnError } from "@/lib/auth/webauthn-mfa"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function WebauthnEnrollDialog({
    open,
    onOpenChange,
    onEnrolled,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onEnrolled: () => void
}) {
    const [friendlyName, setFriendlyName] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [isRegistering, setIsRegistering] = useState(false)

    function handleOpenChange(next: boolean) {
        if (!next) {
            setFriendlyName("")
            setError(null)
            setIsRegistering(false)
        }
        onOpenChange(next)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!friendlyName.trim()) return

        const supabase = createClient()
        setIsRegistering(true)
        setError(null)

        const { error: registerError } = await supabase.auth.mfa.webauthn.register({
            friendlyName: friendlyName.trim(),
        })
        if (registerError) {
            setError(friendlyWebAuthnError(registerError))
            setIsRegistering(false)
            return
        }

        toast.success("Security key added")
        setFriendlyName("")
        setIsRegistering(false)
        onOpenChange(false)
        onEnrolled()
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a security key</DialogTitle>
                    <DialogDescription>
                        Give it a name you&apos;ll recognise, then follow your browser&apos;s prompt to
                        register it.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="webauthn-friendly-name">Name</Label>
                        <Input
                            id="webauthn-friendly-name"
                            placeholder="YubiKey, MacBook Touch ID, …"
                            required
                            autoFocus
                            disabled={isRegistering}
                            value={friendlyName}
                            onChange={(e) => setFriendlyName(e.target.value)}
                        />
                        {error && <p className="text-destructive text-sm">{error}</p>}
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isRegistering || !friendlyName.trim()}>
                            {isRegistering ? "Follow your browser’s prompt…" : "Continue"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
