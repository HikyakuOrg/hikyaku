"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, AlertCircle, CreditCard, Fuel } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

import {
    listFuelCards,
    issueFuelCard,
    listFuelTransactions,
    setFuelCardStatus,
    type IssuingCard,
    type IssuingTransaction,
} from "@/lib/actions/issuing"
import { getTeamMembers, type ListTeamMemberDto } from "@/lib/supabase/team-rpc"
import { getVehiclesByType } from "@/lib/supabase/db"
import { formatCurrency } from "@/lib/currency"
import { getConnectStatus } from "@/lib/actions/connect"
import { useOrgPath } from "@/lib/use-org"

interface VehicleOption {
    id: string
    vehicle_plate: string | null
    vehicle_make: string | null
    vehicle_model: string | null
}

const SUPPORTED_CURRENCIES = [
    { code: "usd", label: "USD — US Dollar" },
    { code: "eur", label: "EUR — Euro" },
    { code: "gbp", label: "GBP — British Pound" },
]

const SPENDING_INTERVALS = [
    { value: "per_authorization", label: "Per transaction" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
    { value: "all_time", label: "All time" },
]

const issueSchema = z.object({
    driverId: z.string().min(1, "Select a driver"),
    vehicleId: z.string().optional(),
    currency: z.string().min(1, "Select a currency"),
    spendingLimitMajor: z
        .string()
        .optional()
        .refine(
            (val) => !val || (!isNaN(Number(val)) && Number(val) > 0),
            "Must be a positive number",
        ),
    interval: z.string().optional(),
})

type IssueFormValues = z.infer<typeof issueSchema>

function statusBadge(status: string) {
    if (status === "active") return <Badge variant="default">Active</Badge>
    if (status === "inactive") return <Badge variant="secondary">Frozen</Badge>
    return <Badge variant="destructive">Canceled</Badge>
}

function minorToMajor(minor: number, currency: string): string {
    return formatCurrency(minor / 100, currency.toUpperCase())
}

function formatDate(iso: string | null | undefined): string {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
}

function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return "—"
    return new Date(iso).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

interface IssueCardDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    drivers: ListTeamMemberDto[]
    vehicles: VehicleOption[]
    onIssued: () => void
}

function IssueCardDialog({
    open,
    onOpenChange,
    drivers,
    vehicles,
    onIssued,
}: IssueCardDialogProps) {
    const [isPending, startTransition] = useTransition()

    const form = useForm<IssueFormValues>({
        resolver: zodResolver(issueSchema),
        defaultValues: {
            driverId: "",
            vehicleId: "",
            currency: "usd",
            spendingLimitMajor: "",
            interval: "daily",
        },
    })

    const handleOpenChange = (next: boolean) => {
        if (isPending) return
        if (!next) form.reset()
        onOpenChange(next)
    }

    const onSubmit = (values: IssueFormValues) => {
        startTransition(async () => {
            const limitMajor =
                values.spendingLimitMajor && values.spendingLimitMajor !== ""
                    ? Number(values.spendingLimitMajor)
                    : null
            const result = await issueFuelCard({
                driverId: values.driverId,
                vehicleId: values.vehicleId || null,
                spendingLimitMajor: limitMajor,
                interval: values.interval || "daily",
                currency: values.currency,
            })
            if (!result.success) {
                toast.error(result.error)
                return
            }
            toast.success("Fuel card issued successfully")
            form.reset()
            onOpenChange(false)
            onIssued()
        })
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Issue Fuel Card</DialogTitle>
                    <DialogDescription>
                        Issue a virtual fuel card restricted to fuel merchants. The card can be added to Apple or Google Pay.
                    </DialogDescription>
                </DialogHeader>

                <form
                    id="issue-card-form"
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <Label htmlFor="issue-driver">Driver</Label>
                        <Controller
                            name="driverId"
                            control={form.control}
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger id="issue-driver">
                                        <SelectValue placeholder="Select driver" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {drivers.map((d) => (
                                            <SelectItem key={d.id} value={d.id}>
                                                {d.display_name || d.email}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {form.formState.errors.driverId && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {form.formState.errors.driverId.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="issue-vehicle">Vehicle (optional)</Label>
                        <Controller
                            name="vehicleId"
                            control={form.control}
                            render={({ field }) => (
                                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                                    <SelectTrigger id="issue-vehicle">
                                        <SelectValue placeholder="No vehicle assigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vehicles.map((v) => (
                                            <SelectItem key={v.id} value={v.id}>
                                                {[v.vehicle_make, v.vehicle_model, v.vehicle_plate]
                                                    .filter(Boolean)
                                                    .join(" · ") || v.id}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="issue-currency">Currency</Label>
                        <Controller
                            name="currency"
                            control={form.control}
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger id="issue-currency">
                                        <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SUPPORTED_CURRENCIES.map((c) => (
                                            <SelectItem key={c.code} value={c.code}>
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {form.formState.errors.currency && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {form.formState.errors.currency.message}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="issue-limit">Spend limit (optional)</Label>
                            <Input
                                id="issue-limit"
                                type="text"
                                inputMode="decimal"
                                placeholder="e.g. 150"
                                {...form.register("spendingLimitMajor")}
                            />
                            {form.formState.errors.spendingLimitMajor && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {form.formState.errors.spendingLimitMajor.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="issue-interval">Limit interval</Label>
                            <Controller
                                name="interval"
                                control={form.control}
                                render={({ field }) => (
                                    <Select value={field.value ?? "daily"} onValueChange={field.onChange}>
                                        <SelectTrigger id="issue-interval">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SPENDING_INTERVALS.map((i) => (
                                                <SelectItem key={i.value} value={i.value}>
                                                    {i.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>
                </form>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" form="issue-card-form" disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Issuing…
                            </>
                        ) : (
                            "Issue card"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export function FuelCardsClient() {
    const [cards, setCards] = useState<IssuingCard[]>([])
    const [transactions, setTransactions] = useState<IssuingTransaction[]>([])
    const [drivers, setDrivers] = useState<ListTeamMemberDto[]>([])
    const [vehicles, setVehicles] = useState<VehicleOption[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [statusPending, startStatusTransition] = useTransition()
    const [issuingActive, setIssuingActive] = useState(true)
    const paymentsPath = useOrgPath("/dashboard/settings/payments")

    const fetchCards = useCallback(async () => {
        const [cardsResult, txnResult] = await Promise.all([
            listFuelCards(),
            listFuelTransactions(),
        ])
        if (cardsResult.success) setCards(cardsResult.data)
        else toast.error(cardsResult.error)
        if (txnResult.success) setTransactions(txnResult.data)
    }, [])

    useEffect(() => {
        setLoading(true)
        Promise.all([
            fetchCards(),
            getTeamMembers(1, 200).then((members) =>
                setDrivers(members.filter((m) => m.role === "Driver")),
            ),
            getVehiclesByType([], 1, 200).then((res) => setVehicles(res.data as VehicleOption[])),
            getConnectStatus().then((res) => {
                if (res.success) setIssuingActive(res.data.cardIssuingStatus === "active")
            }),
        ]).finally(() => setLoading(false))
    }, [fetchCards])

    const handleSetStatus = (card: IssuingCard, status: "active" | "inactive" | "canceled") => {
        startStatusTransition(async () => {
            const result = await setFuelCardStatus(card.id, status)
            if (!result.success) {
                toast.error(result.error)
                return
            }
            setCards((prev) => prev.map((c) => (c.id === card.id ? result.data : c)))
            toast.success(
                status === "inactive"
                    ? "Card frozen"
                    : status === "active"
                      ? "Card unfrozen"
                      : "Card canceled",
            )
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading…
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {!issuingActive && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Card issuing isn&apos;t set up yet</AlertTitle>
                    <AlertDescription>
                        Set up your organisation&apos;s Stripe account to issue and fund
                        fuel cards.{" "}
                        <Link href={paymentsPath} className="font-medium underline">
                            Go to Payments settings
                        </Link>
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex justify-end">
                <Button onClick={() => setDialogOpen(true)} disabled={!issuingActive}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Issue card
                </Button>
            </div>

            <Tabs defaultValue="cards">
                <TabsList>
                    <TabsTrigger value="cards">Cards ({cards.length})</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions ({transactions.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="cards" className="mt-4">
                    {cards.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                            <Fuel className="h-10 w-10 opacity-30" />
                            <p>No fuel cards yet. Issue one to get started.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Card</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Currency</TableHead>
                                        <TableHead>Spend limit</TableHead>
                                        <TableHead>Interval</TableHead>
                                        <TableHead>Issued</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cards.map((card) => (
                                        <TableRow key={card.id}>
                                            <TableCell className="font-mono">
                                                •••• {card.last4 ?? "????"}
                                            </TableCell>
                                            <TableCell>{statusBadge(card.status)}</TableCell>
                                            <TableCell className="uppercase">{card.currency ?? "—"}</TableCell>
                                            <TableCell>
                                                {card.spendingLimitMinor != null
                                                    ? minorToMajor(card.spendingLimitMinor, card.currency ?? "usd")
                                                    : "No limit"}
                                            </TableCell>
                                            <TableCell>
                                                {SPENDING_INTERVALS.find(
                                                    (i) => i.value === card.spendingInterval,
                                                )?.label ?? "—"}
                                            </TableCell>
                                            <TableCell>{formatDate(card.createdAt)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-2 justify-end">
                                                    {card.status === "active" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={statusPending}
                                                            onClick={() => handleSetStatus(card, "inactive")}
                                                        >
                                                            Freeze
                                                        </Button>
                                                    )}
                                                    {card.status === "inactive" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={statusPending}
                                                            onClick={() => handleSetStatus(card, "active")}
                                                        >
                                                            Unfreeze
                                                        </Button>
                                                    )}
                                                    {card.status !== "canceled" && (
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            disabled={statusPending}
                                                            onClick={() => handleSetStatus(card, "canceled")}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="transactions" className="mt-4">
                    {transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                            <Fuel className="h-10 w-10 opacity-30" />
                            <p>No transactions recorded yet.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Merchant</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((txn) => (
                                        <TableRow key={txn.id}>
                                            <TableCell className="whitespace-nowrap">
                                                {formatDateTime(txn.authorizedAt ?? txn.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">
                                                    {txn.merchantName ?? "Unknown merchant"}
                                                </div>
                                                {(txn.merchantCity || txn.merchantCountry) && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {[txn.merchantCity, txn.merchantCountry]
                                                            .filter(Boolean)
                                                            .join(", ")}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {txn.merchantCategory ?? "—"}
                                            </TableCell>
                                            <TableCell>
                                                {txn.type === "refund" ? (
                                                    <Badge variant="secondary">Refund</Badge>
                                                ) : (
                                                    <Badge variant="outline">Capture</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {txn.type === "refund" && (
                                                    <span className="text-green-600">+</span>
                                                )}
                                                {minorToMajor(txn.amountMinor, txn.currency)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <IssueCardDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                drivers={drivers}
                vehicles={vehicles}
                onIssued={() => {
                    fetchCards()
                }}
            />
        </div>
    )
}
