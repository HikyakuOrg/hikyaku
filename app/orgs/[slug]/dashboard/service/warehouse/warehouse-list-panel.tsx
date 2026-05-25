"use client"

import { useEffect, useRef } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { useInfiniteScroll } from "@/lib/use-infinite-scroll"
import type { WarehouseCardData } from "@/lib/supabase/db-server"
import { WarehouseCard } from "./warehouse-card"

type WarehouseListPanelProps = {
    items: WarehouseCardData[]
    selectedWarehouseId: string | null
    onSelectWarehouse: (id: string) => void
    onLoadMore: () => void
    hasMore: boolean
    isLoading: boolean
}

export function WarehouseListPanel({
    items,
    selectedWarehouseId,
    onSelectWarehouse,
    onLoadMore,
    hasMore,
    isLoading,
}: WarehouseListPanelProps) {
    const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
    const sentinelRef = useInfiniteScroll<HTMLDivElement>({
        onLoadMore,
        disabled: isLoading || !hasMore,
    })

    // Bring the selected card into view (e.g. when a map pin is clicked).
    useEffect(() => {
        if (!selectedWarehouseId) {
            return
        }
        cardRefs.current.get(selectedWarehouseId)?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
        })
    }, [selectedWarehouseId])

    if (items.length === 0 && !isLoading) {
        return (
            <div className="flex h-full items-center justify-center rounded-xl border bg-muted/20 p-6 text-center">
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold">No warehouses yet</h2>
                    <p className="text-sm text-muted-foreground">
                        Add a warehouse to see it on the map and in this list.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full overflow-y-auto rounded-xl border bg-muted/10 p-3">
            <div className="space-y-3">
                {items.map((warehouse) => (
                    <WarehouseCard
                        key={warehouse.id}
                        ref={(node) => {
                            cardRefs.current.set(warehouse.id, node)
                        }}
                        warehouse={warehouse}
                        selected={selectedWarehouseId === warehouse.id}
                        onSelect={onSelectWarehouse}
                    />
                ))}

                {isLoading
                    ? Array.from({ length: 3 }).map((_, index) => (
                          <Skeleton key={`warehouse-skeleton-${index}`} className="h-[74px] w-full rounded-xl" />
                      ))
                    : null}

                {hasMore ? <div ref={sentinelRef} className="h-px w-full" aria-hidden /> : null}
            </div>
        </div>
    )
}
