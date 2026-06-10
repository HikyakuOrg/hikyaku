import Link from "next/link";

export default function BookingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-svh bg-background">
            <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
                <nav
                    aria-label="Main navigation"
                    className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"
                >
                    <Link
                        href="/"
                        className="flex flex-col leading-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    >
                        <span className="text-[10px] font-medium tracking-[0.25em] text-slate-400">飛脚</span>
                        <span className="text-xl font-extrabold tracking-tight text-slate-900">Hikyaku</span>
                    </Link>
                </nav>
            </header>
            <main className="mx-auto max-w-4xl px-1 py-8">
                {children}
            </main>
        </div>
    )
}
