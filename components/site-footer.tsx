import Link from "next/link";

export function SiteFooter() {
    return (
        <footer className="border-t border-slate-100 bg-white px-6 py-10">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-400 md:flex-row">
                <Link href="/" className="flex flex-col leading-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                    <span className="text-[9px] font-medium tracking-[0.25em] text-slate-400">飛脚</span>
                    <span className="font-bold text-slate-900">Hikyaku</span>
                </Link>
                <div className="flex gap-6">
                    <Link href="/#features" className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded">Product</Link>
                    <Link href="/#platform" className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded">Resources</Link>
                    <Link href="#" className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded">Privacy</Link>
                    <Link href="#" className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded">Terms</Link>
                    <Link href="/auth/login" className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded">Dashboard</Link>
                </div>
            </div>
        </footer>
    );
}
