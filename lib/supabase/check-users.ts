import { cacheLife, cacheTag } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

// Uses @supabase/supabase-js directly (no SSR/cookie wrapper) because
// `use cache` cannot access runtime APIs like cookies(), and this RPC
// is callable by the anon role — no session required.
export async function checkHasUsers(): Promise<boolean> {
    'use cache'
    cacheTag('has-users')
    cacheLife('hours')

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!
    )
    const { data, error } = await supabase.rpc('has_any_users')
    if (error) throw error
    return data as boolean
}
