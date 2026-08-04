import { redirect } from 'next/navigation'

// Marketing lives on a separate deploy at the apex (hikyaku.org). This app is
// served on app.hikyaku.org, so the root hands off to the org resolver — which
// sends authenticated users to their dashboard and anonymous users to login
// (via middleware). See app/dashboard/page.tsx for the same pattern.
export default function RootPage() {
  redirect('/orgs')
}
