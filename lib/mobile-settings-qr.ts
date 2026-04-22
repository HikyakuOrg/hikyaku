// Helper to build the QR code payload for mobile settings
export function buildMobileSettingsQrPayload({ supabaseUrl, supabaseAnonKey }: { supabaseUrl: string, supabaseAnonKey: string }) {
    const params = new URLSearchParams({
        supabaseUrl,
        supabaseAnonKey,
    });
    return params.toString();
}
