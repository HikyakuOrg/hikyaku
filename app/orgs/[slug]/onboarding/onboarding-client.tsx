"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    loadConnectAndInitialize,
    type StripeConnectInstance,
} from "@stripe/connect-js"
import {
    ConnectComponentsProvider,
    ConnectAccountOnboarding,
} from "@stripe/react-connect-js"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createAccountSession, getConnectStatus } from "@/lib/actions/connect"
import { orgPath } from "@/lib/subdomain"

// All countries supported by Stripe Connect.
const STRIPE_COUNTRIES = [
    { code: "AU", label: "Australia" },
    { code: "AT", label: "Austria" },
    { code: "BE", label: "Belgium" },
    { code: "BR", label: "Brazil" },
    { code: "BG", label: "Bulgaria" },
    { code: "CA", label: "Canada" },
    { code: "HR", label: "Croatia" },
    { code: "CY", label: "Cyprus" },
    { code: "CZ", label: "Czech Republic" },
    { code: "DK", label: "Denmark" },
    { code: "EE", label: "Estonia" },
    { code: "FI", label: "Finland" },
    { code: "FR", label: "France" },
    { code: "DE", label: "Germany" },
    { code: "GH", label: "Ghana" },
    { code: "GI", label: "Gibraltar" },
    { code: "GR", label: "Greece" },
    { code: "HK", label: "Hong Kong" },
    { code: "HU", label: "Hungary" },
    { code: "IN", label: "India" },
    { code: "ID", label: "Indonesia" },
    { code: "IE", label: "Ireland" },
    { code: "IT", label: "Italy" },
    { code: "JP", label: "Japan" },
    { code: "KE", label: "Kenya" },
    { code: "LV", label: "Latvia" },
    { code: "LI", label: "Liechtenstein" },
    { code: "LT", label: "Lithuania" },
    { code: "LU", label: "Luxembourg" },
    { code: "MY", label: "Malaysia" },
    { code: "MT", label: "Malta" },
    { code: "MX", label: "Mexico" },
    { code: "NL", label: "Netherlands" },
    { code: "NZ", label: "New Zealand" },
    { code: "NG", label: "Nigeria" },
    { code: "NO", label: "Norway" },
    { code: "PH", label: "Philippines" },
    { code: "PL", label: "Poland" },
    { code: "PT", label: "Portugal" },
    { code: "RO", label: "Romania" },
    { code: "SG", label: "Singapore" },
    { code: "SK", label: "Slovakia" },
    { code: "SI", label: "Slovenia" },
    { code: "ZA", label: "South Africa" },
    { code: "ES", label: "Spain" },
    { code: "SE", label: "Sweden" },
    { code: "CH", label: "Switzerland" },
    { code: "TH", label: "Thailand" },
    { code: "TT", label: "Trinidad & Tobago" },
    { code: "GB", label: "United Kingdom" },
    { code: "US", label: "United States" },
    { code: "UY", label: "Uruguay" },
]

export function OnboardingClient({ slug }: { slug: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [connectInstance, setConnectInstance] = useState<StripeConnectInstance | null>(null)
    const [starting, startTransition] = useTransition()
    const [country, setCountry] = useState("US")

    const beginOnboarding = useCallback(
        (c: string) => {
            startTransition(async () => {
                const first = await createAccountSession(c)
                if (!first.success) {
                    toast.error(first.error)
                    return
                }
                const { publishableKey } = first.data
                const instance = loadConnectAndInitialize({
                    publishableKey,
                    fetchClientSecret: async () => {
                        const r = await createAccountSession(c)
                        if (!r.success) throw new Error(r.error)
                        return r.data.clientSecret
                    },
                })
                setConnectInstance(instance)
            })
        },
        [],
    )

    useEffect(() => {
        let active = true
        getConnectStatus()
            .then((result) => {
                if (!active) return
                if (!result.success) {
                    toast.error(result.error)
                    return
                }
                const s = result.data
                if (s.country) setCountry(s.country)
                // Account exists but onboarding unfinished — resume embedded flow.
                if (s.accountId && !s.detailsSubmitted) {
                    beginOnboarding(s.country ?? "US")
                }
                // Already done — skip straight to dashboard.
                if (s.detailsSubmitted) {
                    router.replace(orgPath(slug, "/dashboard"))
                }
            })
            .finally(() => {
                if (active) setLoading(false)
            })
        return () => {
            active = false
        }
    }, [beginOnboarding, router, slug])

    const handleExit = useCallback(async () => {
        const result = await getConnectStatus()
        if (result.success && result.data.detailsSubmitted) {
            router.push(orgPath(slug, "/dashboard"))
        }
    }, [router, slug])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading…
            </div>
        )
    }

    if (connectInstance) {
        return (
            <Card className="w-full max-w-3xl">
                <CardHeader>
                    <CardTitle>Finish your payments setup</CardTitle>
                    <CardDescription>
                        Complete the steps below to activate your Stripe account.
                        You can issue fuel cards once your account is verified.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ConnectComponentsProvider connectInstance={connectInstance}>
                        <ConnectAccountOnboarding onExit={handleExit} />
                    </ConnectComponentsProvider>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle>Set up payments</CardTitle>
                <CardDescription>
                    Select your country to create a Stripe account. This enables card
                    payments and, where available, fuel card issuing.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select value={country} onValueChange={(v) => v && setCountry(v)}>
                        <SelectTrigger id="country">
                            <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                            {STRIPE_COUNTRIES.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                    {c.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    onClick={() => beginOnboarding(country)}
                    disabled={starting}
                    className="w-full"
                >
                    {starting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Starting…
                        </>
                    ) : (
                        "Continue"
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}
