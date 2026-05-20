

import { AppSidebar } from "@/components/ui/sidebar/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getSupabaseServerClaims } from "@/lib/supabase/server"
import { listMyOrganisations } from "@/lib/actions/organisations"
import { listPendingInvitations } from "@/lib/actions/invitations"
import { PendingInvitationsDialog } from "@/components/pending-invitations-dialog"
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

  const [organisations, pendingInvitations, headerList] = await Promise.all([
    listMyOrganisations(),
    listPendingInvitations(),
    headers(),
  ])

  const currentPathname = headerList.get('x-pathname') ?? ''
  // A brand-new invitee with zero orgs but a pending invite should see the
  // dialog instead of being routed to "create an organisation".
  if (
    organisations.length === 0 &&
    pendingInvitations.length === 0 &&
    currentPathname !== '/dashboard/new'
  ) {
    redirect('/dashboard/new')
  }

  if (organisations.length === 0) {
    return (
      <>
        {pendingInvitations.length > 0 && (
          <PendingInvitationsDialog invitations={pendingInvitations} />
        )}
        {children}
      </>
    )
  }

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
        {pendingInvitations.length > 0 && (
          <PendingInvitationsDialog invitations={pendingInvitations} />
        )}
        {children}
      </SidebarInset>
    </>
  )
}
