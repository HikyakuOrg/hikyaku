import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      redirect('/orgs')
    }
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/auth/error?error=No+code+provided')
}
