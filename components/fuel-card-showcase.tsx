// Presentational visuals for the Fuel cards feature page. All static dummy data
// — no API calls, no client state. Built entirely in CSS so nothing here depends
// on a third-party card render or stock image.

const BRAND = "#312c85" // matches --primary (deep indigo)

// A tap-to-pay contactless glyph, kept small so it never outweighs the card.
function Contactless({ className = "" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
            className={className}
        >
            <path d="M8 8a6 6 0 0 1 0 8" />
            <path d="M11.5 6a9 9 0 0 1 0 12" />
            <path d="M15 4a12 12 0 0 1 0 16" />
        </svg>
    )
}

interface CardProps {
    last4: string
    holder: string
    className?: string
}

/** A single virtual fuel card. Credit-card proportions (1.586:1). */
export function FuelCardVisual({ last4, holder, className = "" }: CardProps) {
    return (
        <div
            className={`relative aspect-[1.586/1] w-full overflow-hidden rounded-2xl p-5 text-white shadow-2xl ring-1 ring-white/10 ${className}`}
            style={{
                background: `linear-gradient(135deg, ${BRAND} 0%, #1e1b4b 55%, #0f172a 100%)`,
            }}
        >
            {/* soft sheen */}
            <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)" }}
            />

            <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                    <div className="flex flex-col leading-none">
                        <span className="text-[8px] font-medium tracking-[0.3em] text-white/50">飛脚</span>
                        <span className="mt-0.5 text-base font-extrabold tracking-tight">Hikyaku</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                            Fuel only
                        </span>
                        <Contactless className="h-4 w-4 text-white/60" />
                    </div>
                </div>

                {/* chip */}
                <div className="flex items-center gap-3">
                    <div className="h-6 w-8 rounded-md bg-gradient-to-br from-amber-200 to-amber-400">
                        <div className="mx-auto mt-[7px] h-px w-5 bg-amber-700/30" />
                        <div className="mx-auto mt-[3px] h-px w-5 bg-amber-700/30" />
                    </div>
                    <span className="font-mono text-sm tracking-[0.2em] text-white/85">
                        ••••&nbsp;••••&nbsp;••••&nbsp;{last4}
                    </span>
                </div>

                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-[8px] uppercase tracking-[0.18em] text-white/40">Cardholder</p>
                        <p className="mt-0.5 text-sm font-medium uppercase tracking-wide">{holder}</p>
                    </div>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">
                        Virtual
                    </span>
                </div>
            </div>
        </div>
    )
}

/** Two cards fanned with depth — the hero anchor. */
export function FuelCardStack() {
    return (
        <div className="relative mx-auto w-full max-w-sm">
            <FuelCardVisual
                last4="8836"
                holder="Mia Nguyen"
                className="absolute left-6 top-10 rotate-6 opacity-90"
            />
            <FuelCardVisual
                last4="4291"
                holder="Kenji Tanaka"
                className="relative -rotate-3"
            />
        </div>
    )
}

// ---------------------------------------------------------------------------
// Software demo — a faithful, dummy-data view of the dashboard's Fuel cards
// page. Status is shown with a small dot, never a badge.
// ---------------------------------------------------------------------------

const DEMO_CARDS = [
    { last4: "4291", holder: "Kenji Tanaka", vehicle: "Hilux · ABC-123", limit: "$150 / day", active: true },
    { last4: "8836", holder: "Mia Nguyen", vehicle: "Transit · DEF-456", limit: "$200 / day", active: true },
    { last4: "1204", holder: "Sam Okafor", vehicle: "Van · GHI-789", limit: "No limit", active: false },
]

const DEMO_TXNS = [
    { holder: "Kenji Tanaka", merchant: "BP Rocklea", place: "Brisbane QLD", when: "Today, 9:14 AM", amount: "$72.40" },
    { holder: "Mia Nguyen", merchant: "Ampol Foodary", place: "Parramatta NSW", when: "Today, 8:02 AM", amount: "$88.15" },
    { holder: "Sam Okafor", merchant: "Shell Coles Express", place: "Richmond VIC", when: "Yesterday, 4:51 PM", amount: "$54.90" },
    { holder: "Kenji Tanaka", merchant: "United Petroleum", place: "Eight Mile Plains QLD", when: "Yesterday, 7:33 AM", amount: "$66.20" },
    { holder: "Mia Nguyen", merchant: "Caltex", place: "Homebush NSW", when: "Mon, 6:48 AM", amount: "$79.05" },
]

function StatusDot({ active }: { active: boolean }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span
                className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`}
            />
            {active ? "Active" : "Frozen"}
        </span>
    )
}

/** The main "showcase the software" panel — a browser-style window. */
export function FuelActivityPanel() {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            {/* window chrome */}
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="ml-3 text-xs font-medium text-slate-400">Fleet · Fuel cards</span>
            </div>

            <div className="grid md:grid-cols-[260px_1fr]">
                {/* cards column */}
                <div className="border-b border-slate-100 p-4 md:border-b-0 md:border-r">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Cards</p>
                    <ul className="mt-3 space-y-3">
                        {DEMO_CARDS.map((c) => (
                            <li key={c.last4} className="rounded-xl border border-slate-100 p-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-sm text-slate-900">•••• {c.last4}</span>
                                    <StatusDot active={c.active} />
                                </div>
                                <p className="mt-1.5 text-sm font-medium text-slate-700">{c.holder}</p>
                                <p className="text-xs text-slate-400">{c.vehicle}</p>
                                <p className="mt-1 text-xs text-slate-500">{c.limit}</p>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* transactions column */}
                <div className="p-4">
                    <div className="flex items-baseline justify-between">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Recent fuel purchases
                        </p>
                        <span className="text-xs text-slate-400">This week</span>
                    </div>
                    <ul className="mt-3 divide-y divide-slate-100">
                        {DEMO_TXNS.map((t, i) => (
                            <li key={i} className="flex items-center justify-between gap-4 py-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-900">{t.merchant}</p>
                                    <p className="truncate text-xs text-slate-500">
                                        {t.holder} · {t.place}
                                    </p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="font-mono text-sm text-slate-900">{t.amount}</p>
                                    <p className="text-xs text-slate-400">{t.when}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}

/** A compact card-with-controls used beside the "spend you decide" copy. */
export function FuelCardControls() {
    return (
        <div className="mx-auto max-w-md space-y-4">
            <FuelCardVisual last4="4291" holder="Kenji Tanaka" />
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Spend limit</span>
                    <span className="text-sm font-semibold text-slate-900">$150 / day</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-sm text-slate-500">Allowed at</span>
                    <span className="text-sm font-semibold text-slate-900">Fuel merchants only</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-sm text-slate-500">Status</span>
                    <StatusDot active />
                </div>
            </div>
        </div>
    )
}

/** Issuing balance + masked bank-transfer detail for the funding section. */
export function IssuingBalancePanel() {
    return (
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Issuing balance</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-slate-900">
                $4,820.00
            </p>
            <p className="mt-1 text-xs text-slate-400">Shared across every card you&apos;ve issued</p>

            <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Top up by bank transfer
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <dt className="text-slate-500">Account name</dt>
                        <dd className="font-medium text-slate-700">Hikyaku Issuing</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-slate-500">BSB</dt>
                        <dd className="font-mono text-slate-700">000-000</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-slate-500">Account</dt>
                        <dd className="font-mono text-slate-700">•••• 0000</dd>
                    </div>
                </dl>
            </div>
        </div>
    )
}
