

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
import { getTrialStatus, getShiftUsage } from "@/lib/actions/billing"
import { PendingInvitationsDialog } from "@/components/pending-invitations-dialog"
import { TrialEndedDialog } from "@/components/trial-ended-dialog"
import { OrganisationProvider } from "@/components/organisation-provider"
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

type DashboardLayoutProps = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

// The outer shell (SidebarProvider) is static and prerenderable.
// The inner AuthenticatedShell accesses cookies via getSupabaseServerClaims()
// and must be inside <Suspense> to satisfy PPR (cacheComponents: true).
export default function DashboardLayout({ children, params }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <Suspense>
        <AuthenticatedShell params={params}>{children}</AuthenticatedShell>
      </Suspense>
    </SidebarProvider>
  )
}

async function AuthenticatedShell({ children, params }: DashboardLayoutProps) {
  const { data, error } = await getSupabaseServerClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  const { slug } = await params

  const [organisations, pendingInvitations, trial, shiftUsage] = await Promise.all([
    listMyOrganisations(),
    listPendingInvitations(),
    // Null when the API does not answer, so the dashboard still renders.
    getTrialStatus(),
    // Also null on error. The database enforces the allowance.
    getShiftUsage(),
  ])

  const currentOrg = organisations.find(org => org.slug === slug)

  if (!currentOrg) {
    if (pendingInvitations.length > 0) {
      return <PendingInvitationsDialog invitations={pendingInvitations} />
    }
    redirect('/orgs')
  }

  // Stripe Connect setup is optional (Business Information).
  const cardIssuingActive = currentOrg.cardIssuingStatus === 'active'
  // Service Rates needs payments.
  const serviceRatesActive = currentOrg.chargesEnabled
  // Only `expired` blocks. `none` means no trial. Null means the API did not
  // answer, which must not lock anyone out.
  const trialEnded = trial?.state === 'expired'

  return (
    <>
      <AppSidebar
        user={data.claims!}
        organisations={organisations}
        currentSlug={slug}
        cardIssuingActive={cardIssuingActive}
        serviceRatesActive={serviceRatesActive}
        trial={trial}
        shiftUsage={shiftUsage}
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
        {pendingInvitations.length > 0 ? (
          <PendingInvitationsDialog invitations={pendingInvitations} />
        ) : (
          // One dialog only: neither can be closed. Invitations come first,
          // because accepting one opens another organisation.
          trialEnded && trial && <TrialEndedDialog trial={trial} />
        )}
        <OrganisationProvider organisationId={currentOrg.id}>{children}</OrganisationProvider>
      </SidebarInset>
    </>
  )
}
