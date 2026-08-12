"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { CaretDownIcon } from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
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

const CODE_LENGTH = 6

type Enrollment = {
    factorId: string
    qrCode: string
    secret: string
}

export function TotpEnrollDialog({
    open,
    onOpenChange,
    onEnrolled,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onEnrolled: () => void
}) {
    const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
    const [code, setCode] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (!open) return

        // Cleared on close in handleOpenChange, so state is already fresh here.
        const supabase = createClient()
        supabase.auth.mfa
            .enroll({ factorType: "totp", issuer: "Hikyaku" })
            .then(({ data, error: enrollError }) => {
                if (enrollError || !data || data.type !== "totp") {
                    setError(enrollError?.message ?? "Could not start enrollment.")
                    return
                }
                setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
            })
        // Deliberately fires once per dialog open — re-running on every render
        // would re-enroll and abandon the previous unverified factor.
    }, [open])

    function handleOpenChange(next: boolean) {
        // Closing before verifying leaves an unverified factor behind server-side.
        // Clean it up — allowed at any aal since it was never verified.
        if (!next && enrollment) {
            const supabase = createClient()
            void supabase.auth.mfa.unenroll({ factorId: enrollment.factorId })
        }
        if (!next) {
            setEnrollment(null)
            setCode("")
            setError(null)
        }
        onOpenChange(next)
    }

    async function handleVerify(e: React.FormEvent) {
        e.preventDefault()
        if (!enrollment) return

        const supabase = createClient()
        setIsSubmitting(true)
        setError(null)

        const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
            factorId: enrollment.factorId,
            code,
        })
        if (verifyError) {
            setError(verifyError.message)
            setIsSubmitting(false)
            return
        }

        setIsSubmitting(false)
        toast.success("Authenticator app added")
        setEnrollment(null)
        setCode("")
        onOpenChange(false)
        onEnrolled()
    }

    async function copySecret() {
        if (!enrollment) return
        await navigator.clipboard.writeText(enrollment.secret)
        toast.success("Copied")
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add an authenticator app</DialogTitle>
                    <DialogDescription>
                        Scan this QR code with an authenticator app or password manager, then enter the
                        code it shows you.
                    </DialogDescription>
                </DialogHeader>

                {enrollment ? (
                    <form onSubmit={handleVerify} className="flex flex-col gap-4">
                        <div className="flex justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element -- data: URI, not an allowlistable host */}
                            <img
                                src={enrollment.qrCode}
                                alt="Scan this QR code with your authenticator app"
                                className="size-40 rounded-md border p-2"
                            />
                        </div>

                        <Collapsible>
                            <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm">
                                <CaretDownIcon className="size-3.5" />
                                Can&apos;t scan? Enter this code manually
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-2">
                                <div className="flex items-center gap-2">
                                    <code className="bg-muted flex-1 truncate rounded-md px-3 py-2 text-xs">
                                        {enrollment.secret}
                                    </code>
                                    <Button type="button" variant="outline" size="sm" onClick={copySecret}>
                                        Copy
                                    </Button>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>

                        <div className="grid gap-2">
                            <Label htmlFor="totp-enroll-code">Code from your app</Label>
                            <Input
                                id="totp-enroll-code"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                pattern={`\\d{${CODE_LENGTH}}`}
                                maxLength={CODE_LENGTH}
                                placeholder="123456"
                                required
                                autoFocus
                                className="h-12 text-center text-lg tracking-[0.4em]"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
                            />
                            {error && <p className="text-destructive text-sm">{error}</p>}
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting || code.length !== CODE_LENGTH}>
                                {isSubmitting ? "Verifying…" : "Verify and add"}
                            </Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <div className="flex flex-col gap-4">
                        {error ? (
                            <p className="text-destructive text-sm">{error}</p>
                        ) : (
                            <p className="text-muted-foreground text-sm">Setting up…</p>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
