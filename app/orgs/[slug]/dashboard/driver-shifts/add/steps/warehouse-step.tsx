"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import { Tables } from "@/lib/supabase/supabase"
import { searchWarehouse } from "@/lib/supabase/db"
import { Location } from "@/app/models/package-optimisation"

type Point = { coordinates: [number, number] }

export interface WarehouseStepData {
    warehouseId: string
    warehouseName: string
    warehouseLocation: [number, number]
}

export function WarehouseStep({
    defaultValues,
    onNext,
}: {
    defaultValues?: WarehouseStepData
    onNext: (data: WarehouseStepData) => void
}) {
    const [searchTerm, setSearchTerm] = useState("")
    const [results, setResults] = useState<Tables<"warehouse">[]>([])
    const [selectedWarehouse, setSelectedWarehouse] = useState<Tables<"warehouse"> | null>(null)
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const timeout = setTimeout(async () => {
            if (!searchTerm || searchTerm.length < 2) {
                setResults([])
                setIsLoading(false)
                return
            }
            setIsLoading(true)
            try {
                const data = await searchWarehouse(searchTerm)
                setResults(data ?? [])
            } catch {
                // silently fail search
            } finally {
                setIsLoading(false)
            }
        }, 300)

        return () => clearTimeout(timeout)
    }, [searchTerm])

    function handleSubmit() {
        if (!selectedWarehouse) {
            setError("Please select a warehouse to continue.")
            return
        }
        const loc = selectedWarehouse.warehouse_location as unknown as Location | null
        const coords: [number, number] = [loc?.coordinates?.[0] ?? 0, loc?.coordinates?.[1] ?? 0]
        onNext({
            warehouseId: selectedWarehouse.id,
            warehouseName: selectedWarehouse.warehouse_name,
            warehouseLocation: coords,
        })
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">Select Warehouse</h3>
                <p className="text-muted-foreground mt-2 leading-7">
                    Choose the warehouse this shift will depart from and return to.
                </p>
            </div>

            <Combobox
                open={open}
                onOpenChange={setOpen}
                items={results}
                itemToStringValue={(w) => w.warehouse_name}
                value={selectedWarehouse}
                onValueChange={(w) => {
                    setSelectedWarehouse(w)
                    setSearchTerm(w?.warehouse_name ?? "")
                    setError(null)
                }}
            >
                <ComboboxInput
                    placeholder="Search warehouses..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setError(null)
                    }}
                />
                <ComboboxContent>
                    {isLoading && (
                        <div className="px-4 py-2 text-sm text-muted-foreground">Searching...</div>
                    )}
                    {!isLoading && results.length === 0 && searchTerm.length >= 2 && (
                        <ComboboxEmpty>No warehouses found.</ComboboxEmpty>
                    )}
                    <ComboboxList>
                        {(w) => (
                            <ComboboxItem key={w.id} value={w}>
                                <div className="flex flex-col">
                                    <span className="font-medium">{w.warehouse_name}</span>
                                    <span className="text-xs text-muted-foreground">{w.warehouse_address}</span>
                                </div>
                            </ComboboxItem>
                        )}
                    </ComboboxList>
                </ComboboxContent>
            </Combobox>

            {selectedWarehouse && (
                <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
                    <p className="font-medium">{selectedWarehouse.warehouse_name}</p>
                    <p className="text-muted-foreground">{selectedWarehouse.warehouse_address}</p>
                </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end">
                <Button onClick={handleSubmit}>Next</Button>
            </div>
        </div>
    )
}
