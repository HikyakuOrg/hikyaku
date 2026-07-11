"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Sparkles, Loader2 } from "lucide-react"

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    triggerOptimisation,
    getOptimisationStatus,
    getOptimisationVehicles,
    getOptimisationWarehouses,
    type OptimisationRunInfo,
    type OptimisationWarehouse,
} from "@/lib/actions/optimisation"
import type { OptimisationVehicleOption } from "@/lib/supabase/db-server"
import { SHIFTS_REFRESH_EVENT } from "./shift-events"

/** Current time, refreshed every second after mount (null during prerender). */
function useTickingNow(): Date | null {
    const [now, setNow] = useState<Date | null>(null)
    useEffect(() => {
        // First value on the next macrotask so we never setState synchronously
        // inside the effect body; the interval keeps it ticking each second.
        const first = setTimeout(() => setNow(new Date()), 0)
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => {
            clearTimeout(first)
            clearInterval(id)
        }
    }, [])
    return now
}

function formatCountdown(ms: number): string {
    const total = Math.max(0, Math.ceil(ms / 1000))
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${m}:${String(s).padStart(2, "0")}`
}

export function OptimiseRoutesButton() {
    const router = useRouter()
    const now = useTickingNow()

    const [loaded, setLoaded] = useState(false)
    const [warehouses, setWarehouses] = useState<OptimisationWarehouse[]>([])
    const [run, setRun] = useState<OptimisationRunInfo | null>(null)
    const [cooldownUntil, setCooldownUntil] = useState<string | null>(null)
    const [open, setOpen] = useState(false)
    const [warehouseId, setWarehouseId] = useState("")
    const [vehicles, setVehicles] = useState<OptimisationVehicleOption[]>([])
    const [loadingVehicles, setLoadingVehicles] = useState(false)
    const [setOffByVehicle, setSetOffByVehicle] = useState<Record<string, string>>({})
    const [submitting, startTransition] = useTransition()

    const isInFlight = run?.status === "queued" || run?.status === "running"

    // Latest of the known run's nextAllowedAt and any 429 cooldown.
    const nextAllowedMs = [run?.nextAllowedAt, cooldownUntil]
        .filter((v): v is string => !!v)
        .map((v) => new Date(v).getTime())
    const nextAllowed = nextAllowedMs.length ? new Date(Math.max(...nextAllowedMs)) : null
    const isCoolingDown = !!nextAllowed && !!now && now < nextAllowed

    const disabled = !loaded || warehouses.length === 0 || isInFlight || isCoolingDown || submitting

    // Initial load: warehouses + latest run status.
    useEffect(() => {
        let active = true
        Promise.all([getOptimisationWarehouses(), getOptimisationStatus()]).then(
            ([wh, status]) => {
                if (!active) return
                if (Array.isArray(wh)) {
                    setWarehouses(wh)
                    setWarehouseId((id) => id || wh[0]?.id || "")
                }
                if (status && !("error" in status)) setRun(status)
                setLoaded(true)
            },
        )
        return () => {
            active = false
        }
    }, [])

    // Poll while a run is in flight.
    useEffect(() => {
        if (!isInFlight) return
        let active = true
        const id = setInterval(async () => {
            const res = await getOptimisationStatus()
            if (active && res && !("error" in res)) setRun(res)
        }, 5000)
        return () => {
            active = false
            clearInterval(id)
        }
    }, [isInFlight])

    // Toast + refresh when a run reaches a terminal state.
    const prevStatus = useRef<string | undefined>(undefined)
    useEffect(() => {
        const s = run?.status
        const prev = prevStatus.current
        prevStatus.current = s
        if (!s || !prev) return
        const wasActive = prev === "queued" || prev === "running"
        const isTerminal = s === "completed" || s === "failed" || s === "skipped"
        if (!wasActive || !isTerminal) return
        if (s === "completed") {
            toast.success("Routes optimised.")
            router.refresh()
            // The calendar fetches its shifts client-side, so router.refresh()
            // (server components only) won't surface the new shift — signal it directly.
            window.dispatchEvent(new Event(SHIFTS_REFRESH_EVENT))
        } else if (s === "skipped") {
            toast.message("No pending packages to optimise.")
        } else {
            toast.error(run?.error ? `Optimisation failed: ${run.error}` : "Optimisation failed.")
        }
    }, [run?.status, run?.error, router])

    async function loadVehicles(whId: string) {
        if (!whId) return
        setLoadingVehicles(true)
        const res = await getOptimisationVehicles(whId)
        if (Array.isArray(res)) setVehicles(res)
        else {
            setVehicles([])
            toast.error(res.error)
        }
        setLoadingVehicles(false)
    }

    function openDialog() {
        if (disabled) return
        setOpen(true)
        setVehicles([])
        void loadVehicles(warehouseId)
    }

    function handleSubmit() {
        const setOffOverrides = Object.entries(setOffByVehicle)
            .filter(([, v]) => v)
            .map(([vehicleId, v]) => ({ vehicleId, setOffAt: new Date(v).toISOString() }))

        startTransition(async () => {
            const res = await triggerOptimisation({ warehouseId, setOffOverrides })
            if ("error" in res) {
                if (res.nextAllowedAt) setCooldownUntil(res.nextAllowedAt)
                toast.error(res.error)
                return
            }
            toast.success("Optimisation started. Routes will appear shortly.")
            setOpen(false)
            setSetOffByVehicle({})
            // Optimistic in-flight state so polling + cooldown start immediately.
            setRun({
                id: res.runId,
                status: "queued",
                requestedAt: new Date().toISOString(),
                optimisationId: null,
                error: null,
                nextAllowedAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            })
        })
    }

    let disabledReason: string | null = null
    if (loaded && warehouses.length === 0) disabledReason = "No warehouse available."
    else if (isInFlight) disabledReason = "Optimisation in progress…"
    else if (isCoolingDown && nextAllowed && now) {
        const at = nextAllowed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        disabledReason = `Next optimisation at ${at} (in ${formatCountdown(nextAllowed.getTime() - now.getTime())})`
    }

    return (
        <>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                        <Button variant="outline" disabled={disabled} onClick={openDialog}>
                            {isInFlight ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Sparkles className="h-4 w-4" />
                            )}
                            {isInFlight ? "Optimising…" : "Optimise routes"}
                        </Button>
                    </TooltipTrigger>
                    {disabledReason && (
                        <TooltipContent side="bottom">{disabledReason}</TooltipContent>
                    )}
                </Tooltip>
            </TooltipProvider>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Optimise routes</DialogTitle>
                        <DialogDescription>
                            Build routes now for pending packages. Vehicles already out keep their
                            current trip and are planned for a new wave 30&nbsp;min after they return.
                            Optionally set a custom set-off time per vehicle.
                        </DialogDescription>
                    </DialogHeader>

                    {warehouses.length > 1 && (
                        <div className="space-y-2">
                            <Label>Warehouse</Label>
                            <Select
                                value={warehouseId}
                                onValueChange={(v) => {
                                    setWarehouseId(v as string)
                                    void loadVehicles(v as string)
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select warehouse" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((w) => (
                                        <SelectItem key={w.id} value={w.id}>
                                            {w.warehouse_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Set-off times (optional)</Label>
                        <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-2">
                            {loadingVehicles ? (
                                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading vehicles…
                                </div>
                            ) : vehicles.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                    No driver–vehicle pairs in this warehouse.
                                </div>
                            ) : (
                                vehicles.map((v) => (
                                    <div
                                        key={v.vehicleId}
                                        className="flex items-center justify-between gap-3"
                                    >
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium">
                                                {v.driverName}
                                            </div>
                                            <div className="truncate text-xs text-muted-foreground">
                                                {v.vehiclePlate || "No plate"}
                                            </div>
                                        </div>
                                        <Input
                                            type="datetime-local"
                                            className="w-52"
                                            value={setOffByVehicle[v.vehicleId] ?? ""}
                                            onChange={(e) =>
                                                setSetOffByVehicle((prev) => ({
                                                    ...prev,
                                                    [v.vehicleId]: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={submitting || !warehouseId}>
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Starting…
                                </>
                            ) : (
                                "Optimise"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
