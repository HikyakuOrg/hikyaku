"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BuildingsIcon, PlugsConnectedIcon, UserCircleIcon } from "@phosphor-icons/react"

import { buttonVariants } from "@/components/ui/button-variants"
import { Card } from "@/components/ui/card"
import { useOrgPath } from "@/lib/use-org"
import { cn } from "@/lib/utils"

export function SettingsNav({
    showBusinessInformation,
}: {
    /** Business Information only applies to company orgs. */
    showBusinessInformation: boolean
}) {
    const pathname = usePathname()
    // Hooks stay unconditional; the gate is applied when building the list.
    const accountHref = useOrgPath("/dashboard/user/account")
    const businessHref = useOrgPath("/dashboard/user/business")
    const connectedAppsHref = useOrgPath("/dashboard/user/connected-apps")

    const items = [
        {
            label: "Account",
            href: accountHref,
            icon: UserCircleIcon,
        },
        ...(showBusinessInformation
            ? [
                  {
                      label: "Business Information",
                      href: businessHref,
                      icon: BuildingsIcon,
                  },
              ]
            : []),
        {
            label: "Connected Apps",
            href: connectedAppsHref,
            icon: PlugsConnectedIcon,
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
