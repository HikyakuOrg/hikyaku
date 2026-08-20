

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
    // Resolved for the org in the URL, which middleware forwards as x-org-slug.
    // Returns null rather than throwing if the API is unreachable, so a backend
    // blip degrades to "no countdown" instead of an unrenderable dashboard.
    getTrialStatus(),
    // Same fail-open-to-null shape, same reason: a sidebar indicator, not the
    // enforcement point (see AddShiftUsageMetering in hikyaku-api).
    getShiftUsage(),
  ])

  const currentOrg = organisations.find(org => org.slug === slug)

  if (!currentOrg) {
    if (pendingInvitations.length > 0) {
      return <PendingInvitationsDialog invitations={pendingInvitations} />
    }
    redirect('/orgs')
  }

  // Company orgs can use the dashboard immediately; Stripe Connect setup is
  // now opt-in via the Business Information page in the user dropdown.
  const cardIssuingActive = currentOrg.cardIssuingStatus === 'active'
  // "Service Rates" (the unit-priced catalog) only makes sense once the org can
  // actually accept payments.
  const serviceRatesActive = currentOrg.chargesEnabled
  // Only `expired` blocks. `none` covers personal orgs and orgs that predate
  // trials — they are unrestricted, not lapsed — and a null trial means the API
  // did not answer, which must not lock anyone out on its own.
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
          // Only one at a time. Both dialogs are non-dismissible, so stacking
          // them would leave the user with no way out of the top one. Invitations
          // win because accepting one navigates to a different organisation,
          // which resolves the expired trial as a side effect — whereas the
          // trial dialog offers no route to the invitation.
          trialEnded && trial && <TrialEndedDialog trial={trial} />
        )}
        {children}
      </SidebarInset>
    </>
  )
}
