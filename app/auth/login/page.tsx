import { redirect } from 'next/navigation'
import { checkHasUsers } from '@/lib/supabase/check-users'
import { LoginForm } from '@/components/login-form'

export default async function Page() {
  const hasUsers = await checkHasUsers()
  if (!hasUsers) redirect('/onboarding')

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}
