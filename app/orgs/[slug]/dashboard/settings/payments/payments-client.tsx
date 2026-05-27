"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import {
    loadConnectAndInitialize,
    type StripeConnectInstance,
} from "@stripe/connect-js"
import {
    ConnectComponentsProvider,
    ConnectAccountOnboarding,
} from "@stripe/react-connect-js"
import { Loader2, CheckCircle2, Banknote } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import {
    getConnectStatus,
    createAccountSession,
    getFundingInstructions,
    getIssuingBalance,
    type ConnectStatus,
    type FundingInstructions,
    type IssuingBalance,
} from "@/lib/actions/connect"
import { formatCurrency } from "@/lib/currency"

// Countries supported by Stripe Issuing self-funding via push bank transfers.
const COUNTRIES = [
    { code: "US", label: "United States", currency: "usd" },
    { code: "GB", label: "United Kingdom", currency: "gbp" },
    { code: "DE", label: "Germany", currency: "eur" },
    { code: "FR", label: "France", currency: "eur" },
    { code: "IE", label: "Ireland", currency: "eur" },
    { code: "NL", label: "Netherlands", currency: "eur" },
    { code: "ES", label: "Spain", currency: "eur" },
    { code: "IT", label: "Italy", currency: "eur" },
]

function currencyForCountry(countryCode: string): string {
    return COUNTRIES.find((c) => c.code === countryCode)?.currency ?? "usd"
}

function isOnboarded(status: ConnectStatus): boolean {
    return status.cardIssuingStatus === "active"
}

export function PaymentsClient() {
    const [status, setStatus] = useState<ConnectStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [connectInstance, setConnectInstance] =
        useState<StripeConnectInstance | null>(null)
    const [starting, startStartTransition] = useTransition()

    // Onboarding-country form (only used before an account exists).
    const [country, setCountry] = useState("US")

    const refreshStatus = useCallback(async () => {
        const result = await getConnectStatus()
        if (!result.success) {
            toast.error(result.error)
            return null
        }
        setStatus(result.data)
        return result.data
    }, [])

    // Begin (or resume) embedded onboarding. The first createAccountSession call
    // both creates the connected account and returns the platform publishable
    // key needed to initialise @stripe/connect-js.
    const beginOnboarding = useCallback(
        (c: string, cur: string) => {
            startStartTransition(async () => {
                const first = await createAccountSession(c, cur)
                if (!first.success) {
                    toast.error(first.error)
                    return
                }
                const { publishableKey } = first.data
                const instance = loadConnectAndInitialize({
                    publishableKey,
                    fetchClientSecret: async () => {
                        const r = await createAccountSession(c, cur)
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
                setStatus(result.data)
                if (result.data.country) setCountry(result.data.country)
                // An account exists but onboarding is unfinished → resume inline.
                if (result.data.accountId && !isOnboarded(result.data)) {
                    const c = result.data.country ?? "US"
                    beginOnboarding(c, result.data.currency ?? currencyForCountry(c))
                }
            })
            .finally(() => {
                if (active) setLoading(false)
            })
        return () => {
            active = false
        }
    }, [beginOnboarding])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading…
            </div>
        )
    }

    if (status && isOnboarded(status)) {
        return <OnboardedView status={status} />
    }

    // Onboarding in progress (embedded component mounted).
    if (connectInstance) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Finish your onboarding</CardTitle>
                    <CardDescription>
                        Complete the steps below. Your card-issuing capability activates
                        once you have verified your details.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ConnectComponentsProvider connectInstance={connectInstance}>
                        <ConnectAccountOnboarding
                            onExit={() => {
                                void refreshStatus().then((s) => {
                                    if (s && isOnboarded(s)) {
                                        setConnectInstance(null)
                                        toast.success("Card issuing is now active")
                                    }
                                })
                            }}
                        />
                    </ConnectComponentsProvider>
                </CardContent>
            </Card>
        )
    }

    // No account yet → pick onboarding country (currency is derived automatically).
    const detectedCurrency = currencyForCountry(country)

    return (
        <Card className="max-w">
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select value={country} onValueChange={(v) => v && setCountry(v)}>
                        <SelectTrigger id="country">
                            <SelectValue>
                                {(v: string | null) =>
                                    COUNTRIES.find((c) => c.code === v)?.label ?? "Select country"
                                }
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {COUNTRIES.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                    {c.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        Currency: {detectedCurrency.toUpperCase()}
                    </p>
                </div>

                <Button
                    onClick={() => beginOnboarding(country, detectedCurrency)}
                    disabled={starting}
                >
                    {starting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Starting…
                        </>
                    ) : (
                        "Start onboarding"
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}

function OnboardedView({ status }: { status: ConnectStatus }) {
    const [balance, setBalance] = useState<IssuingBalance[] | null>(null)
    const [funding, setFunding] = useState<FundingInstructions | null>(null)
    const [fundingPending, startFundingTransition] = useTransition()

    useEffect(() => {
        getIssuingBalance().then((r) => {
            if (r.success) setBalance(r.data)
        })
    }, [])

    const showFunding = () => {
        startFundingTransition(async () => {
            const r = await getFundingInstructions()
            if (!r.success) {
                toast.error(r.error)
                return
            }
            setFunding(r.data)
        })
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <CardTitle>Card issuing active</CardTitle>
                    </div>
                    <CardDescription>
                        Account {status.accountId} · {status.country} ·{" "}
                        {(status.currency ?? "").toUpperCase()}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    <Badge variant={status.chargesEnabled ? "default" : "secondary"}>
                        Charges {status.chargesEnabled ? "enabled" : "pending"}
                    </Badge>
                    <Badge variant={status.payoutsEnabled ? "default" : "secondary"}>
                        Payouts {status.payoutsEnabled ? "enabled" : "pending"}
                    </Badge>
                    <Badge variant="default">Issuing active</Badge>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Issuing balance</CardTitle>
                    <CardDescription>
                        Funds available to spend on cards. Top up from your own bank using
                        the instructions below.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {balance === null ? (
                        <div className="text-muted-foreground text-sm flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading balance…
                        </div>
                    ) : balance.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            No balance yet. Add funds to start spending.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-4">
                            {balance.map((b) => (
                                <div key={b.currency} className="text-2xl font-semibold">
                                    {formatCurrency(b.amount / 100, b.currency.toUpperCase())}
                                </div>
                            ))}
                        </div>
                    )}

                    <Button
                        variant="outline"
                        onClick={showFunding}
                        disabled={fundingPending}
                    >
                        <Banknote className="mr-2 h-4 w-4" />
                        {fundingPending ? "Loading…" : "Show funding instructions"}
                    </Button>

                    {funding && <FundingDetails funding={funding} />}
                </CardContent>
            </Card>
        </div>
    )
}

function FundingDetails({ funding }: { funding: FundingInstructions }) {
    return (
        <div className="rounded-md border p-4 space-y-4 text-sm">
            <p className="text-muted-foreground">
                Send a bank transfer from your organisation&apos;s bank account to the
                details below. Funds appear in your Issuing balance once received.
            </p>
            {funding.bank_transfer.financial_addresses.map((addr, i) => {
                const type = String(addr.type ?? "")
                const detail = (addr[type] ?? {}) as Record<string, unknown>
                return (
                    <div key={i} className="space-y-1">
                        <div className="font-medium uppercase text-xs text-muted-foreground">
                            {type.replace(/_/g, " ")}
                        </div>
                        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-0.5">
                            {Object.entries(detail)
                                .filter(([, v]) => typeof v === "string" || typeof v === "number")
                                .map(([k, v]) => (
                                    <div key={k} className="contents">
                                        <dt className="text-muted-foreground">
                                            {k.replace(/_/g, " ")}
                                        </dt>
                                        <dd className="font-mono">{String(v)}</dd>
                                    </div>
                                ))}
                        </dl>
                    </div>
                )
            })}
        </div>
    )
}
