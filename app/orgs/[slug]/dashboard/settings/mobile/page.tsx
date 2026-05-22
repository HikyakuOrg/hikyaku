import { MobileSettingsQr } from "@/components/settings/mobile-settings-qr";
import { buildMobileSettingsQrPayload } from "@/lib/mobile-settings-qr";


export default function MobileSettingsPage() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return <div className="p-6">Missing Supabase environment variables.</div>;
    }

    const qrValue = buildMobileSettingsQrPayload({ supabaseUrl, supabaseAnonKey });

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Scan the QR code in WhenDan app</h1>
                <p className="text-muted-foreground">Use the WhenDan mobile app to scan this code and connect securely.</p>
            </div>
            <MobileSettingsQr value={qrValue} />
        </div>
    );
}
