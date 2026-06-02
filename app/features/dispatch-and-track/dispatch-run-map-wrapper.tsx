"use client"

import dynamic from "next/dynamic"

const DispatchRunMap = dynamic(
    () => import("./dispatch-run-map").then((m) => ({ default: m.DispatchRunMap })),
    { ssr: false }
)

export function DispatchRunMapWrapper() {
    return <DispatchRunMap />
}
