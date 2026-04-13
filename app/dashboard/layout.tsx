

import { AppSidebar } from "@/components/ui/sidebar/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getSupabaseServerClaims } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'

type DashboardLayoutProps = {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data, error } = await getSupabaseServerClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  return (
    <SidebarProvider>
      {data.claims && (
        <AppSidebar user={data.claims} />
      )}

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ms-1" />
            <Separator
              orientation="vertical"
              className="me-2 data-vertical:h-4 data-vertical:self-auto"
            />
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
