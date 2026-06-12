"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { CaretUpDownIcon, GearIcon, SignOutIcon } from "@phosphor-icons/react"
import { JwtPayload } from "@supabase/supabase-js"
import { createClient } from '@/lib/supabase/client'
import { useOrgPath } from "@/lib/use-org"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export function NavUser({
  user,
}: {
  user: JwtPayload
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const accountPath = useOrgPath('/dashboard/user/account')

  const [displayName, setDisplayName] = useState<string>(
    user?.user_metadata?.display_name ?? ""
  )

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const name = session?.user?.user_metadata?.display_name
      if (name !== undefined) {
        setDisplayName(name)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  function logout() {
    const supabase = createClient()
    supabase.auth.signOut().then()
    router.push('/auth/login')
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-accent-foreground" />
            }
          >
            <Avatar className="h-8 w-8 rounded-lg">
              {displayName && (
                <AvatarFallback className="rounded-lg">{displayName.substring(0, 1)}</AvatarFallback>
              )}
            </Avatar>

            <div className="grid flex-1 text-start text-sm leading-tight">
              {displayName && (
                <span className="truncate font-medium">{displayName}</span>
              )}
              <span className="truncate text-xs">{user.email}</span>
            </div>
            <CaretUpDownIcon className="ms-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push(accountPath)}>
                <GearIcon
                />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              logout()
            }}>
              <SignOutIcon
              />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
