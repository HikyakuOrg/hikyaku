import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from './supabase'

function requireEnv(name: string): string {
    const value = process.env[name]
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`)
    }

    return value
}

export function createAdminClient() {
    return createSupabaseClient<Database>(
        requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
        requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    )
}

export function createTokenClient() {
    return createSupabaseClient<Database>(
        requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
        requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY')
    )
}
