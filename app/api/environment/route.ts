

export async function GET(request: Request) { 
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;
    const HIKYAKU_API_URL = process.env.NEXT_PUBLIC_HIKYAKU_API_URL;
    
    return Response.json({ 
        'SUPABASE_URL': SUPABASE_URL,
        'SUPABASE_ANON_KEY': SUPABASE_ANON_KEY,
        'HIKYAKU_API_URL': HIKYAKU_API_URL
    })
}
