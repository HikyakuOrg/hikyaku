"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ImageIcon, Loader2, Trash2 } from "lucide-react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip"
import { uploadOrganisationLogo } from "@/lib/supabase/storage"
import { updateOrganisationLogo } from "@/lib/actions/organisations"
import { QrCodeWithLogo } from "@/components/qr-code-with-logo"

const MAX_LOGO_BYTES = 2 * 1024 * 1024

/**
 * Lets a company org upload a logo that then gets embedded into every QR
 * code the dashboard renders for them (see components/qr-code-with-logo.tsx
 * and package-label.tsx). Upload goes straight from the browser to the
 * org-logos storage bucket, same pattern as driver avatars — this component
 * only persists the resulting URL onto organisations.logo_url afterwards.
 */
export function LogoSection({
    slug,
    organisationId,
    initialLogoUrl,
}: {
    slug: string
    organisationId: string
    initialLogoUrl: string | null
}) {
    const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
    const [busy, setBusy] = useState(false)

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file) return

        if (!file.type.startsWith("image/")) {
            toast.error("Logo must be an image file.")
            return
        }
        if (file.size > MAX_LOGO_BYTES) {
            toast.error("Logo must be smaller than 2MB.")
            return
        }

        setBusy(true)
        try {
            const url = await uploadOrganisationLogo(organisationId, file)
            const result = await updateOrganisationLogo(slug, url)
            if (!result.success) {
                toast.error(result.error)
                return
            }
            setLogoUrl(url)
            toast.success("Logo updated.")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to upload logo.")
        } finally {
            setBusy(false)
        }
    }

    async function handleRemove() {
        setBusy(true)
        try {
            const result = await updateOrganisationLogo(slug, null)
            if (!result.success) {
                toast.error(result.error)
                return
            }
            setLogoUrl(null)
            toast.success("Logo removed.")
        } finally {
            setBusy(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Company logo</CardTitle>
                <CardDescription>
                    Shown at the centre of every QR code on your package labels and
                    tracking links. PNG or JPG, up to 2MB.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
                {logoUrl ? (
                    <div className="relative w-24 h-24 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element -- Supabase storage URL resolved at runtime. */}
                        <img
                            src={logoUrl}
                            alt="Organisation logo"
                            className="w-24 h-24 rounded-lg object-contain border bg-white shadow-sm"
                        />
                        <Tooltip>
                            <TooltipTrigger>
                                <label className="absolute inset-0 rounded-lg bg-black/20 opacity-0 hover:opacity-100 transition flex items-center justify-center text-white text-xs cursor-pointer">
                                    Change
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={busy}
                                        onChange={handleUpload}
                                    />
                                </label>
                            </TooltipTrigger>
                        </Tooltip>
                    </div>
                ) : (
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 cursor-pointer hover:border-gray-500 hover:text-gray-600 shrink-0">
                        <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
                            {busy ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                                <>
                                    <ImageIcon className="h-6 w-6 mb-1" />
                                    <span className="text-xs">Upload</span>
                                </>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={busy}
                                onChange={handleUpload}
                            />
                        </label>
                    </div>
                )}

                <div className="flex flex-col items-center gap-2">
                    <span className="text-xs text-muted-foreground">QR preview</span>
                    <QrCodeWithLogo value="https://hikyaku.org" logoUrl={logoUrl} size={96} />
                </div>

                {logoUrl && (
                    <button
                        type="button"
                        onClick={handleRemove}
                        disabled={busy}
                        className="ml-auto text-sm text-muted-foreground hover:text-destructive flex items-center gap-1 disabled:opacity-50"
                    >
                        <Trash2 className="h-4 w-4" />
                        Remove
                    </button>
                )}
            </CardContent>
        </Card>
    )
}
