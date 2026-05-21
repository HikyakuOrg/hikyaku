type ResendEmailSummary = {
    id: string
    to: string[]
    from: string
    subject: string
    created_at: string
}

type ResendListResponse = {
    object: "list"
    has_more: boolean
    data: ResendEmailSummary[]
}

export type ResendEmail = ResendEmailSummary & {
    html: string | null
    text: string | null
}

type WaitOptions = {
    toAddress: string
    fromAddress: string
    since: Date
    timeoutMs?: number
    pollIntervalMs?: number
}

async function resendGet<T>(path: string, apiKey: string): Promise<T> {
    const res = await fetch(`https://api.resend.com${path}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) {
        throw new Error(`Resend ${path} returned ${res.status} ${res.statusText}`)
    }
    return res.json() as Promise<T>
}

export async function waitForVerificationEmail(opts: WaitOptions): Promise<{ email: ResendEmail; confirmUrl: string }> {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
        throw new Error("RESEND_API_KEY not set — required by tests/e2e/helpers/resend.ts")
    }
    const timeoutMs = opts.timeoutMs ?? 60_000
    const pollIntervalMs = opts.pollIntervalMs ?? 2_000
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
        const list = await resendGet<ResendListResponse>("/emails/receiving?limit=50", apiKey)

        for (const summary of list.data ?? []) {
            if (new Date(summary.created_at) < opts.since) continue
            if (!summary.to.includes(opts.toAddress)) continue
            if (summary.from !== opts.fromAddress) continue

            const full = await resendGet<ResendEmail>(`/emails/receiving/${summary.id}`, apiKey)
            const confirmUrl = extractConfirmUrl(full.html)
            if (!confirmUrl) {
                throw new Error(`Verification email ${full.id} had no /auth/confirm link`)
            }
            return { email: full, confirmUrl }
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
    }

    throw new Error(`Timed out after ${timeoutMs}ms waiting for verification email to ${opts.toAddress} from ${opts.fromAddress}`)
}

function extractConfirmUrl(html: string | null): string | null {
    if (!html) return null
    const match = html.match(/href="(https?:\/\/[^"]*\/auth\/confirm[^"]*)"/i)
    if (!match) return null
    return decodeHtmlEntities(match[1])
}

function decodeHtmlEntities(input: string): string {
    return input
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#x2F;/g, "/")
        .replace(/&#x3D;/g, "=")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
}
