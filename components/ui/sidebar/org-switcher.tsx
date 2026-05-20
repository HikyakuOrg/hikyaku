"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { CaretUpDownIcon, BuildingsIcon, PlusIcon, CheckIcon } from "@phosphor-icons/react"
import { tenantUrl } from "@/lib/subdomain"
import type { OrganisationSummary } from "@/lib/actions/organisations"
import { useRouter } from "next/navigation"

export function OrgSwitcher({
  organisations,
  currentSlug,
}: {
  organisations: OrganisationSummary[]
  currentSlug: string | null
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const current =
    organisations.find((o) => o.slug === currentSlug) ?? organisations[0] ?? null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-accent-foreground" />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <BuildingsIcon className="size-4" />
            </div>
            <div className="grid flex-1 text-start text-sm leading-tight">
              <span className="truncate font-medium">
                {current.name}
              </span>
            </div>
            <CaretUpDownIcon className="ms-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={4}
          >
            {organisations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => {
                  if (org.slug !== currentSlug) {
                    window.location.href = tenantUrl(org.slug, "/dashboard")
                  }
                }}
              >
                <span className="truncate">{org.name}</span>
                {org.slug === currentSlug && (
                  <CheckIcon className="ms-auto size-4" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/new")}>
              <PlusIcon />
              New organisation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
