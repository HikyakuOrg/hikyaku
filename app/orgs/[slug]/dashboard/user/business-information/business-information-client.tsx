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
import { setOrgType } from "@/lib/actions/organisations"
import { formatCurrency } from "@/lib/currency"

// All countries supported by Stripe Connect (same list as the old onboarding
// route). Stripe Issuing is only supported in a subset of these; the
// card-issuing capability activates automatically once Stripe verifies the
// account in a supported country.
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

type OrgType = "personal" | "company"

export function BusinessInformationClient({
    slug,
    initialOrgType,
}: {
    slug: string
    initialOrgType: OrgType
}) {
    const router = useRouter()
    const [orgType, setLocalOrgType] = useState<OrgType>(initialOrgType)
    const [typeSwitching, startTypeTransition] = useTransition()

    const handleToggle = (next: OrgType) => {
        if (next === orgType || typeSwitching) return
        startTypeTransition(async () => {
            const result = await setOrgType(slug, next)
            if (typeof result === "string") {
                toast.error(result)
                return
            }
            setLocalOrgType(next)
            // Layout-level data (sidebar, card_issuing_active) reads from the
            // server — refresh so it stays in sync.
            router.refresh()
        })
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Account type</CardTitle>
                    <CardDescription>
                        Personal accounts have no payment setup. Switch to Company to
                        enable payments and fuel-card issuing.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="inline-flex rounded-md border bg-background p-1">
                        <TypeButton
                            label="Personal"
                            active={orgType === "personal"}
                            disabled={typeSwitching}
                            onClick={() => handleToggle("personal")}
                        />
                        <TypeButton
                            label="Company"
                            active={orgType === "company"}
                            disabled={typeSwitching}
                            onClick={() => handleToggle("company")}
                        />
                    </div>
                </CardContent>
            </Card>

            {orgType === "company" ? <CompanySection /> : <PersonalHint />}
        </div>
    )
}

function TypeButton({
    label,
    active,
    disabled,
    onClick,
}: {
    label: string
    active: boolean
    disabled: boolean
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={
                "px-4 py-1.5 text-sm rounded-sm transition-colors " +
                (active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground")
            }
            aria-pressed={active}
        >
            {label}
        </button>
    )
}

function PersonalHint() {
    return (
        <Card>
            <CardContent className="text-sm text-muted-foreground py-6">
                This account is personal. Switch to Company above to add business
                details and enable fuel-card issuing.
            </CardContent>
        </Card>
    )
}

function isOnboarded(status: ConnectStatus): boolean {
    return status.detailsSubmitted
}

function CompanySection() {
    const [status, setStatus] = useState<ConnectStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [connectInstance, setConnectInstance] =
        useState<StripeConnectInstance | null>(null)
    const [starting, startStartTransition] = useTransition()
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

    // Begin (or resume) embedded onboarding. The first createAccountSession
    // call both creates the connected account and returns the platform
    // publishable key needed to initialise @stripe/connect-js.
    const beginOnboarding = useCallback((c: string) => {
        startStartTransition(async () => {
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
    }, [])

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
                // Account exists but onboarding is unfinished → resume inline.
                if (result.data.accountId && !isOnboarded(result.data)) {
                    beginOnboarding(result.data.country ?? "US")
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
                    <CardTitle>Finish your payments setup</CardTitle>
                    <CardDescription>
                        Complete the steps below to activate your Stripe account. You
                        can issue fuel cards once your account is verified.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ConnectComponentsProvider connectInstance={connectInstance}>
                        <ConnectAccountOnboarding
                            onExit={() => {
                                void refreshStatus().then((s) => {
                                    if (s && isOnboarded(s)) {
                                        setConnectInstance(null)
                                        toast.success(
                                            "Stripe account submitted. Verification is in progress.",
                                        )
                                    }
                                })
                            }}
                        />
                    </ConnectComponentsProvider>
                </CardContent>
            </Card>
        )
    }

    // No account yet → pick onboarding country.
    return (
        <Card>
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
                    <Select
                        value={country}
                        onValueChange={(v) => v && setCountry(v)}
                    >
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

function OnboardedView({ status }: { status: ConnectStatus }) {
    const [balance, setBalance] = useState<IssuingBalance[] | null>(null)
    const [funding, setFunding] = useState<FundingInstructions | null>(null)
    const [fundingPending, startFundingTransition] = useTransition()

    const issuingActive = status.cardIssuingStatus === "active"

    useEffect(() => {
        if (!issuingActive) return
        getIssuingBalance().then((r) => {
            if (r.success) setBalance(r.data)
        })
    }, [issuingActive])

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
                        <CardTitle>Stripe account connected</CardTitle>
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
                    <Badge variant={issuingActive ? "default" : "secondary"}>
                        Issuing {issuingActive ? "active" : "pending"}
                    </Badge>
                </CardContent>
            </Card>

            {issuingActive && (
                <Card>
                    <CardHeader>
                        <CardTitle>Issuing balance</CardTitle>
                        <CardDescription>
                            Funds available to spend on cards. Top up from your own bank
                            using the instructions below.
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
                                        {formatCurrency(
                                            b.amount / 100,
                                            b.currency.toUpperCase(),
                                        )}
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
            )}
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
                                .filter(
                                    ([, v]) => typeof v === "string" || typeof v === "number",
                                )
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
