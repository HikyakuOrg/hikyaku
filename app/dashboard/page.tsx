import { redirect } from 'next/navigation'

// The dashboard is org-scoped at /orgs/<slug>/dashboard. A bare /dashboard
// hand-off resolves the user's first org via the existing /orgs resolver
// (which also handles pending invitations and the no-org case).
export default function DashboardRedirectPage() {
  redirect('/orgs')
}
