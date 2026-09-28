import { redirect } from 'next/navigation'

// Marketing is a separate site at the apex. The app root goes to the org resolver.
export default function RootPage() {
  redirect('/orgs')
}
