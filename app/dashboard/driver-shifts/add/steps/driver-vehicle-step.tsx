"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { DriverVehiclePair } from "@/lib/supabase/db-server"
import { fetchAvailableDriverVehiclePairs } from "@/lib/actions/shift"
import { AlertTriangle, Car, User, Loader2 } from "lucide-react"
import { format, parseISO, isBefore } from "date-fns"
import type { WarehouseStepData } from "./warehouse-step"

export interface DriverVehicleStepData {
    driverId: string
    vehicleId: string
    dvaId: string
    vehicleGrossLimits: number
    vehicleOrsType: string
    driverName: string
    vehiclePlate: string
    vehicleMake: string
    vehicleModel: string
    licenseExpiry: string | null
    driverUnderProbation: boolean
}

export function DriverVehicleStep({
    warehouse,
    shiftDate,
    defaultValues,
    onNext,
    onPrev,
}: {
    warehouse: WarehouseStepData
    shiftDate: string
    defaultValues?: DriverVehicleStepData
    onNext: (data: DriverVehicleStepData) => void
    onPrev: () => void
}) {
    const [pairs, setPairs] = useState<DriverVehiclePair[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedDvaId, setSelectedDvaId] = useState<string | null>(defaultValues?.dvaId ?? null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setIsLoading(true)
        fetchAvailableDriverVehiclePairs(warehouse.warehouseId, shiftDate)
            .then(setPairs)
            .catch(() => setError("Failed to load available driver-vehicle pairs."))
            .finally(() => setIsLoading(false))
    }, [warehouse.warehouseId, shiftDate])

    function handleSubmit() {
        const pair = pairs.find((p) => p.dvaId === selectedDvaId)
        if (!pair) {
            setError("Please select a driver-vehicle pair to continue.")
            return
        }
        onNext({
            driverId: pair.driverId,
            vehicleId: pair.vehicleId,
            dvaId: pair.dvaId,
            vehicleGrossLimits: pair.vehicleGrossLimits ?? 0,
            vehicleOrsType: pair.orsVehicleType,
            driverName: pair.driverName,
            vehiclePlate: pair.vehiclePlate,
            vehicleMake: pair.vehicleMake,
            vehicleModel: pair.vehicleModel,
            licenseExpiry: pair.licenseExpiry,
            driverUnderProbation: pair.driverUnderProbation,
        })
    }

    function isLicenseExpired(expiry: string | null) {
        if (!expiry) return false
        return isBefore(parseISO(expiry), parseISO(shiftDate))
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">Assign Driver & Vehicle</h3>
                <p className="text-muted-foreground mt-2 leading-7">
                    Select an available driver-vehicle pair for this shift. Only pairs not already scheduled on{" "}
                    {format(parseISO(shiftDate + "T00:00:00"), "MMMM d, yyyy")} are shown.
                </p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading available pairs...
                </div>
            ) : pairs.length === 0 ? (
                <div className="rounded-md border border-dashed py-12 text-center text-muted-foreground">
                    No available driver-vehicle pairs for this date.
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {pairs.map((pair) => {
                        const expired = isLicenseExpired(pair.licenseExpiry)
                        const isSelected = selectedDvaId === pair.dvaId

                        return (
                            <button
                                key={pair.dvaId}
                                type="button"
                                onClick={() => {
                                    setSelectedDvaId(pair.dvaId)
                                    setError(null)
                                }}
                                className={cn(
                                    "relative rounded-lg border p-4 text-left transition-all hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    isSelected && "border-primary bg-primary/5 ring-1 ring-primary"
                                )}
                            >
                                {pair.driverUnderProbation && (
                                    <Badge variant="destructive" className="absolute top-2 right-2 text-xs">
                                        Probation
                                    </Badge>
                                )}

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="font-medium truncate">{pair.driverName}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                                        <span>License: {pair.licenseType || "—"}</span>
                                        {pair.licenseExpiry && (
                                            <span className={cn(expired && "text-destructive font-medium")}>
                                                Expires: {format(parseISO(pair.licenseExpiry), "dd MMM yyyy")}
                                                {expired && " (Expired)"}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 pt-1 border-t">
                                        <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="font-medium text-sm truncate">
                                            {pair.vehicleMake} {pair.vehicleModel} · {pair.vehiclePlate}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Capacity: {pair.vehicleGrossLimits != null ? `${pair.vehicleGrossLimits} kg` : "Unknown"}
                                    </p>
                                </div>

                                {expired && (
                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                                        <AlertTriangle className="h-3 w-3" />
                                        License expired — verify before proceeding
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-between">
                <Button variant="outline" onClick={onPrev}>Back</Button>
                <Button onClick={handleSubmit} disabled={pairs.length === 0 || isLoading}>Next</Button>
            </div>
        </div>
    )
}
