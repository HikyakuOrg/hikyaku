"use client"

import Link from "next/link"
import type { Ref } from "react"

import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"
import { useOrgSlug } from "@/lib/use-org"
import type { WarehouseCardData } from "@/lib/supabase/db-server"

type WarehouseCardProps = {
    warehouse: WarehouseCardData
    selected: boolean
    onSelect: (id: string) => void
    ref?: Ref<HTMLDivElement>
}

export function WarehouseCard({ warehouse, selected, onSelect, ref }: WarehouseCardProps) {
    const slug = useOrgSlug()

    return (
        <Card
            ref={ref}
            size="sm"
            onClick={() => onSelect(warehouse.id)}
            className={cn(
                "scroll-mt-2 cursor-pointer transition-shadow hover:shadow-md",
                selected && "ring-primary ring-2"
            )}
        >
            <CardContent className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                    <CardTitle className="truncate">{warehouse.warehouse_name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                        {warehouse.warehouse_address}
                    </CardDescription>
                </div>
                <Link
                    href={`/orgs/${slug}/dashboard/service/warehouse/${warehouse.id}`}
                    onClick={(event) => event.stopPropagation()}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
                >
                    View Details
                </Link>
            </CardContent>
        </Card>
    )
}
