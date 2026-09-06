"use client"

import Link from "next/link"
import { useState } from "react"
import { CircleAlert, MapPinCheck } from "lucide-react"

import { AddressAutocomplete, type AddressSuggestion } from "@/components/ui/address-autocomplete"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { getCoverageForPoint } from "@/lib/actions/coverage"
import { getDriversByServiceArea, type ServiceAreaDriver } from "@/lib/supabase/db"
import type { CoverageDiagnosticDto } from "@/lib/api"

type LookupState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
    | {
        status: "ok"
        diagnostic: CoverageDiagnosticDto
        driversByArea: Map<string, ServiceAreaDriver[]>
    }

/**
 * "Which drivers cover this address" (HIK-17), on the areas page next to the
 * list a dispatcher is already looking at.
 *
 * Calls the same coverage diagnostic the assignment engine's own containment
 * query answers from (`getCoverageForPoint`, one shared function with the
 * customer-creation warning), rather than re-testing points against
 * `service_areas` in the browser. Two implementations of "covered" is how a
 * debugging tool ends up disagreeing with the engine it exists to explain.
 */
export function CoverageDebugger({ slug }: { slug: string }) {
    const [address, setAddress] = useState("")
    const [state, setState] = useState<LookupState>({ status: "idle" })

    async function handleSuggestionSelect(suggestion: AddressSuggestion) {
        setState({ status: "loading" })

        const result = await getCoverageForPoint(suggestion.lon, suggestion.lat)

        if (result.status === "no-warehouse") {
            setState({ status: "error", message: "Add a warehouse before checking coverage — there is nothing to resolve drivers against yet." })
            return
        }

        if (result.status === "error") {
            setState({ status: "error", message: result.error })
            return
        }

        const areaIds = result.diagnostic.areas.map((area) => area.id)
        const driversByArea = new Map<string, ServiceAreaDriver[]>()

        try {
            const drivers = await Promise.all(areaIds.map((id) => getDriversByServiceArea(id)))
            areaIds.forEach((id, index) => driversByArea.set(id, drivers[index]))
        } catch (error) {
            // The coverage answer itself is still good even if naming the
            // drivers on each area fails a beat later; fall back to the
            // driverCount the diagnostic already carries rather than losing
            // the whole result.
            console.error(error)
        }

        setState({ status: "ok", diagnostic: result.diagnostic, driversByArea })
    }

    return (
        <Card data-testid="coverage-debugger">
            <CardHeader>
                <CardTitle className="text-lg">Coverage debugger</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Enter an address to see which territories cover it and which drivers are attached
                    to each — the same check dispatch runs when a package is created.
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                <AddressAutocomplete
                    value={address}
                    onChange={setAddress}
                    onSuggestionSelect={(suggestion) => void handleSuggestionSelect(suggestion)}
                    placeholder="Search an address…"
                />

                {state.status === "loading" && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="coverage-debugger-loading">
                        <Spinner className="h-4 w-4" />
                        Checking coverage…
                    </div>
                )}

                {state.status === "error" && (
                    <div
                        className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                        data-testid="coverage-debugger-error"
                    >
                        <CircleAlert className="h-4 w-4 mt-0.5 shrink-0" />
                        {state.message}
                    </div>
                )}

                {state.status === "ok" && (
                    <div className="space-y-4" data-testid="coverage-debugger-result">
                        <p className="text-sm font-medium">{state.diagnostic.explanation}</p>

                        {!state.diagnostic.anyAreaCovers ? (
                            <div
                                className="rounded-md border bg-muted/30 px-4 py-3 text-sm"
                                data-testid="coverage-debugger-uncovered"
                            >
                                No area covers this point. Assignment will fall back to any available
                                driver at the warehouse — nothing is stranded, but nobody has claimed
                                this address either.
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {state.diagnostic.areas.map((area) => {
                                    const drivers = state.driversByArea.get(area.id)

                                    return (
                                        <li key={area.id} className="rounded-md border px-4 py-3 space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <Link
                                                    href={`/orgs/${slug}/dashboard/service/areas/${area.id}`}
                                                    className="font-medium hover:underline underline-offset-2"
                                                >
                                                    {area.name}
                                                </Link>
                                                <Badge variant={area.driverCount === 0 ? "outline" : "secondary"}>
                                                    {area.driverCount} driver{area.driverCount === 1 ? "" : "s"}
                                                </Badge>
                                            </div>

                                            {area.driverCount === 0 ? (
                                                <p className="text-sm text-muted-foreground">
                                                    This territory covers the point, but no driver is attached to
                                                    it — the practical effect is the same as no coverage at all.
                                                </p>
                                            ) : drivers ? (
                                                <p className="text-sm text-muted-foreground">
                                                    {drivers.map((driver) => driver.display_name).join(", ")}
                                                </p>
                                            ) : null}
                                        </li>
                                    )
                                })}
                            </ul>
                        )}

                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <MapPinCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            Tested at {state.diagnostic.point?.lat.toFixed(5)}, {state.diagnostic.point?.lon.toFixed(5)}.
                            This reflects the map as drawn right now, not necessarily what a package
                            placed earlier saw — see a package&apos;s own detail page for that.
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
