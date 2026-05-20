

import { AppSidebar } from "@/components/ui/sidebar/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getSupabaseServerClaims } from "@/lib/supabase/server"
import { listMyOrganisations } from "@/lib/actions/organisations"
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

type DashboardLayoutProps = {
  children: React.ReactNode
}

// The outer shell (SidebarProvider) is static and prerenderable.
// The inner AuthenticatedShell accesses cookies via getSupabaseServerClaims()
// and must be inside <Suspense> to satisfy PPR (cacheComponents: true).
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <Suspense>
        <AuthenticatedShell>{children}</AuthenticatedShell>
      </Suspense>
    </SidebarProvider>
  )
}

async function AuthenticatedShell({ children }: DashboardLayoutProps) {
  const { data, error } = await getSupabaseServerClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  const [organisations, headerList] = await Promise.all([
    listMyOrganisations(),
    headers(),
  ])
  const currentSlug = headerList.get('x-org-slug')

  return (
    <>
      <AppSidebar
        user={data.claims!}
        organisations={organisations}
        currentSlug={currentSlug}
      />
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
    </>
  )
}
