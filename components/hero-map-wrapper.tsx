"use client"

import dynamic from "next/dynamic"

const HeroMap = dynamic(
    () => import("@/components/hero-map").then((m) => ({ default: m.HeroMap })),
    { ssr: false }
)

export function HeroMapWrapper() {
    return <HeroMap />
}
