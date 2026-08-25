"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

export function CopyButton({
    value,
    label = "Copy",
}: {
    value: string
    label?: string
}) {
    const [copied, setCopied] = useState(false)

    async function copy() {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {
            // Clipboard unavailable (e.g. insecure context) — silently ignore.
        }
    }

    return (
        <button
            type="button"
            onClick={copy}
            aria-label={label}
            className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 font-mono text-sm text-foreground transition-colors hover:bg-muted"
        >
            {value}
            {copied ? (
                <Check className="size-3.5 text-emerald-600" />
            ) : (
                <Copy className="size-3.5 text-muted-foreground" />
            )}
        </button>
    )
}
