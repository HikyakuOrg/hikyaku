import { redirect } from 'next/navigation'
import { checkHasUsers } from '@/lib/supabase/check-users'
import { OnboardingForm } from './onboarding-form'

export default async function OnboardingPage() {
    const hasUsers = await checkHasUsers()
    if (hasUsers) redirect('/auth/login')

    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
                <OnboardingForm />
            </div>
        </div>
    )
}
