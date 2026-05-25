"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { WarehouseCardData, WarehousePin } from "@/lib/supabase/db-server"
import { fetchWarehousePage } from "./actions"
import { WarehouseListPanel } from "./warehouse-list-panel"
import { WarehouseMapPanel, type WarehouseFocusRequest } from "./warehouse-map-panel"

type WarehouseExplorerProps = {
    initialPins: WarehousePin[]
    initialItems: WarehouseCardData[]
    initialTotal: number
}

type MobileView = "list" | "map"

export function WarehouseExplorer({ initialPins, initialItems, initialTotal }: WarehouseExplorerProps) {
    const [items, setItems] = useState<WarehouseCardData[]>(initialItems)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(initialTotal)
    const [isLoading, setIsLoading] = useState(false)
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null)
    const [focusRequest, setFocusRequest] = useState<WarehouseFocusRequest | null>(null)
    const [mobileView, setMobileView] = useState<MobileView>("list")
    const [pendingScrollId, setPendingScrollId] = useState<string | null>(null)

    const hasMore = items.length < total

    // Mirror live values into refs so loadMore can stay a stable callback.
    const isLoadingRef = useRef(isLoading)
    isLoadingRef.current = isLoading
    const pageRef = useRef(page)
    pageRef.current = page
    const hasMoreRef = useRef(hasMore)
    hasMoreRef.current = hasMore

    const loadMore = useCallback(async () => {
        if (isLoadingRef.current || !hasMoreRef.current) {
            return
        }
        setIsLoading(true)
        try {
            const nextPage = pageRef.current + 1
            const result = await fetchWarehousePage(nextPage)
            setItems((current) => {
                const seen = new Set(current.map((item) => item.id))
                const merged = [...current]
                for (const item of result.data) {
                    if (!seen.has(item.id)) {
                        merged.push(item)
                    }
                }
                return merged
            })
            setTotal(result.total)
            setPage(nextPage)
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Pin click → select; remember to scroll the card into view once it loads.
    const handleSelectFromPin = useCallback((id: string) => {
        setSelectedWarehouseId(id)
        setPendingScrollId(id)
    }, [])

    // Card click → select and focus the matching pin on the map.
    const handleSelectFromCard = useCallback((id: string) => {
        setSelectedWarehouseId(id)
        setPendingScrollId(null)
        setFocusRequest({ id, token: Date.now() })
    }, [])

    // If a pin was clicked for a warehouse not yet in the list, keep loading
    // pages until it appears (bounded by hasMore). The list scrolls to it via
    // its own selection effect once present.
    useEffect(() => {
        if (!pendingScrollId) {
            return
        }
        if (items.some((item) => item.id === pendingScrollId)) {
            setPendingScrollId(null)
            return
        }
        if (!hasMore) {
            setPendingScrollId(null)
            return
        }
        if (!isLoading) {
            void loadMore()
        }
    }, [pendingScrollId, items, hasMore, isLoading, loadMore])

    return (
        <div className="flex h-[calc(100vh-13rem)] min-h-[420px] flex-col gap-3">
            <Tabs
                value={mobileView}
                onValueChange={(value) => setMobileView(value as MobileView)}
                className="md:hidden"
            >
                <TabsList className="w-full">
                    <TabsTrigger value="list">List</TabsTrigger>
                    <TabsTrigger value="map">Map</TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="min-h-0 flex-1 md:grid md:grid-cols-3 md:grid-rows-1 md:gap-4">
                <div
                    className={cn(
                        "h-full min-h-0 md:col-span-2 md:block",
                        mobileView === "map" ? "block" : "hidden"
                    )}
                >
                    <WarehouseMapPanel
                        pins={initialPins}
                        selectedWarehouseId={selectedWarehouseId}
                        focusRequest={focusRequest}
                        onSelectWarehouse={handleSelectFromPin}
                    />
                </div>

                <div
                    className={cn(
                        "h-full min-h-0 md:col-span-1 md:block",
                        mobileView === "list" ? "block" : "hidden"
                    )}
                >
                    <WarehouseListPanel
                        items={items}
                        selectedWarehouseId={selectedWarehouseId}
                        onSelectWarehouse={handleSelectFromCard}
                        onLoadMore={loadMore}
                        hasMore={hasMore}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        </div>
    )
}
