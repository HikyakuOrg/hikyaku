export default function BookingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-svh bg-background">
            <header className="border-b">
                <div className="mx-auto max-w-3xl px-6 py-4 flex items-center gap-2">
                    <span className="flex flex-col leading-none">
                        <span className="text-[10px] font-medium tracking-[0.25em] text-slate-400">飛脚</span>
                        <span className="text-xl font-extrabold tracking-tight text-slate-900">
                            Hikyaku
                        </span>
                    </span>
                </div>
            </header>
            <main className="mx-auto max-w-4xl px-1 py-8">
                {children}
            </main>
        </div>
    )
}
