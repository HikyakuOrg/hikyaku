"use client"

import dynamic from "next/dynamic"

const PlanRoutesMap = dynamic(
    () => import("@/components/plan-routes-map").then((m) => ({ default: m.PlanRoutesMap })),
    {
        ssr: false,
        loading: () => <div className="absolute inset-0 bg-slate-100" aria-hidden />,
    }
)

export function PlanRoutesMapWrapper() {
    return <PlanRoutesMap />
}
