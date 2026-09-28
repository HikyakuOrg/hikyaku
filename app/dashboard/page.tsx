import { redirect } from 'next/navigation'

// The dashboard is at /orgs/<slug>/dashboard. /orgs finds the user's org.
export default function DashboardRedirectPage() {
  redirect('/orgs')
}
