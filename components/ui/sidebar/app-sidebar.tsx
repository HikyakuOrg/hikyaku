"use client"

import * as React from "react"
import { NavMain } from "@/components/ui/sidebar/nav-main"
import { NavUser } from "@/components/ui/sidebar/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar"
import { GearIcon, PersonIcon, BlueprintIcon, MapTrifoldIcon, PackageIcon, TruckIcon } from "@phosphor-icons/react"
import { JwtPayload } from "@supabase/supabase-js"
import { ClockIcon } from "lucide-react"

const sidebarData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: (
        <BlueprintIcon
        />
      ),
    },
    {
      title: "Packages",
      url: "/dashboard/packages",
      icon: (
        <PackageIcon />
      ),
    },
    {
      title: "Customers",
      url: "/dashboard/customers",
      icon: (
        <PersonIcon />
      ),
    },
    {
      title: "Driver Shifts",
      url: "/dashboard/driver-shifts",
      icon: (
        <ClockIcon />
      ),
    },
    {
      title: "Fleet",
      url: "",
      icon: (
        <TruckIcon />
      ),
      items: [
        {
          title: "Team Members",
          url: "/dashboard/fleet/team-members",
        },
        {
          title: "Vehicles",
          url: "/dashboard/fleet/vehicles",
        }
      ],
    },
    {
      title: "Service",
      url: "",
      icon: (
        <MapTrifoldIcon
        />
      ),
      items: [
        {
          title: "Warehouse",
          url: "/dashboard/service/warehouse",
        },
        {
          title: "Areas",
          url: "/dashboard/service/areas",
        }
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: (
        <GearIcon
        />
      ),
      items: [
        {
          title: "Team",
          url: "/dashboard/settings/team",
        },
        {
          title: "Mobile",
          url: "/dashboard/settings/mobile",
        }
      ],
    },
  ]
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: JwtPayload
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent>
        <NavMain items={sidebarData.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />

      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
