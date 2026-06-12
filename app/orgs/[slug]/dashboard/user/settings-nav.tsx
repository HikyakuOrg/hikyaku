"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BuildingsIcon, UserCircleIcon } from "@phosphor-icons/react"

import { buttonVariants } from "@/components/ui/button-variants"
import { Card } from "@/components/ui/card"
import { useOrgPath } from "@/lib/use-org"
import { cn } from "@/lib/utils"

export function SettingsNav() {
    const pathname = usePathname()
    const items = [
        {
            label: "Account",
            href: useOrgPath("/dashboard/user/account"),
            icon: UserCircleIcon,
        },
        {
            label: "Business Information",
            href: useOrgPath("/dashboard/user/business"),
            icon: BuildingsIcon,
        },
    ]

    return (
        <Card className="p-2 gap-0">
            <nav className="flex flex-col gap-1">
                {items.map((item) => {
                    const active = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                                buttonVariants({ variant: "ghost" }),
                                "justify-start",
                                active
                                    ? "bg-muted text-foreground"
                                    : "text-muted-foreground",
                            )}
                        >
                            <item.icon />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>
        </Card>
    )
}
