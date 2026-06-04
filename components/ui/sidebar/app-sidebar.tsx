"use client"

import * as React from "react"
import { NavMain } from "@/components/ui/sidebar/nav-main"
import { NavUser } from "@/components/ui/sidebar/nav-user"
import { OrgSwitcher } from "@/components/ui/sidebar/org-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { OrganisationSummary } from "@/lib/actions/organisations"
import { orgPath } from "@/lib/subdomain"
import { PersonIcon, BlueprintIcon, MapTrifoldIcon, PackageIcon, TruckIcon } from "@phosphor-icons/react"
import { JwtPayload } from "@supabase/supabase-js"
import { ClockIcon } from "lucide-react"

function buildNavItems(slug: string, cardIssuingActive: boolean, serviceRatesActive: boolean) {
  const p = (path: string) => orgPath(slug, path)
  const fleetItems: { title: string; url: string }[] = [
    { title: "Vehicles", url: p('/dashboard/fleet/vehicles') },
    { title: "Team Members", url: p('/dashboard/fleet/team-members') },
  ]
  if (cardIssuingActive) {
    fleetItems.push({ title: "Fuel Cards", url: p('/dashboard/fleet/fuel-cards') })
  }
  const serviceItems: { title: string; url: string }[] = [
    { title: "Areas", url: p('/dashboard/service/areas') },
    { title: "Warehouse", url: p('/dashboard/service/warehouse') },
  ]
  if (serviceRatesActive) {
    serviceItems.push({ title: "Service Rates", url: p('/dashboard/service-rates') })
  }
  return [
    {
      title: "Dashboard",
      url: p('/dashboard'),
      icon: <BlueprintIcon />,
    },
    {
      title: "Packages",
      url: p('/dashboard/packages'),
      icon: <PackageIcon />,
    },
    {
      title: "Customers",
      url: p('/dashboard/customers'),
      icon: <PersonIcon />,
    },
    {
      title: "Driver Shifts",
      url: p('/dashboard/driver-shifts'),
      icon: <ClockIcon />,
    },
    {
      title: "Fleet",
      url: "",
      icon: <TruckIcon />,
      items: fleetItems,
    },
    {
      title: "Service",
      url: "",
      icon: <MapTrifoldIcon />,
      items: serviceItems,
    }
  ]
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: JwtPayload
  organisations: OrganisationSummary[]
  currentSlug: string | null
  cardIssuingActive?: boolean
  serviceRatesActive?: boolean
}

export function AppSidebar({ user, organisations, currentSlug, cardIssuingActive = false, serviceRatesActive = false, ...props }: AppSidebarProps) {
  const navItems = currentSlug ? buildNavItems(currentSlug, cardIssuingActive, serviceRatesActive) : []
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <OrgSwitcher organisations={organisations} currentSlug={currentSlug} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />

      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
