'use server'

import { revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createFirstUser(_prevState: string | null, formData: FormData) {
    const supabase = await createClient()

    // Re-check inside the action to guard against concurrent submissions
    const { data: hasUsers, error: checkError } = await supabase.rpc('has_any_users' as never)
    if (checkError) return 'Something went wrong. Please try again.'
    if (hasUsers) redirect('/auth/login')

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const displayName = formData.get('displayName') as string

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { display_name: displayName },
        },
    })


    if(error) return error.message

    const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (signInError) return signInError.message

    // Bust the cache so the app now knows at least one user exists
    revalidateTag('has-users')

    redirect('/dashboard')
}
