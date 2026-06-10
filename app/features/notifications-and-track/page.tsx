import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
    title: "Recipient tracking — Hikyaku",
    description:
        "Give every recipient a live window into their delivery — live driver location, status updates, and proof of delivery, all from a single tracking link.",
};

function Eyebrow({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
            {children}
        </p>
    );
}

const TRACKING_STATUSES = [
    { label: "Order received", done: true, time: "9:02 AM" },
    { label: "Route built", done: true, time: "9:14 AM" },
    { label: "Out for delivery", active: true, time: "Est. 9:46 AM" },
    { label: "Delivered", done: false, time: null },
];

const WHAT_IS_ON_THE_PAGE = [
    {
        title: "Live driver location",
        body: "Once a driver is in transit, the map updates in real time. Recipients see the courier moving toward them, not just a static status badge.",
    },
    {
        title: "Status timeline",
        body: "Every change — received, assigned, out for delivery, delivered — stamped with the time it happened and visible in one scroll.",
    },
    {
        title: "Proof of delivery",
        body: "When a parcel is marked delivered, the photos your driver took appear on the tracking page. Both sides see the same evidence.",
    },
    {
        title: "No account required",
        body: "Recipients open the link, enter their tracking number, and see their parcel. Nothing to install or sign up for.",
    },
];

export default function NotificationsAndTrackPage() {
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans">
            <SiteHeader />

            <main>
                {/* Hero */}
                <section className="relative overflow-hidden border-b border-slate-100 px-6 py-20 md:py-28">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{
                            backgroundImage:
                                "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
                            backgroundSize: "28px 28px",
                            opacity: 0.3,
                        }}
                    />
                    <div className="relative mx-auto max-w-3xl text-center">
                        <Eyebrow>Recipient tracking</Eyebrow>
                        <h1
                            className="mt-5 font-[family-name:var(--font-display)] text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 md:text-5xl lg:text-6xl"
                            style={{ textWrap: "balance" } as React.CSSProperties}
                        >
                            Every recipient knows where their parcel is
                        </h1>
                        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-500">
                            A tracking number, a public page, a live map. Your customers follow
                            their delivery from dispatch to doorstep — without calling you once.
                        </p>
                        <div className="mt-8 flex items-center justify-center gap-4">
                            <Link
                                href="/auth/signup"
                                className="inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                            >
                                Start free trial
                            </Link>
                            <Link
                                href="#tracking-page"
                                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                            >
                                See how it works
                                <ArrowRightIcon size={14} weight="bold" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* The tracking page */}
                <section
                    id="tracking-page"
                    className="scroll-mt-20 px-6 py-20 md:py-24"
                >
                    <div className="mx-auto max-w-5xl">
                        <div className="mx-auto max-w-2xl">
                            <Eyebrow>What recipients see</Eyebrow>
                            <h2
                                className="mt-4 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl"
                                style={{ textWrap: "balance" } as React.CSSProperties}
                            >
                                A clean tracking page, no login required
                            </h2>
                            <p className="mt-5 text-base leading-relaxed text-slate-500">
                                Each parcel gets a unique tracking number. Recipients open the
                                booking site, enter the number, and land on a live view — status,
                                map, courier details, and a full timeline, all on one page.
                            </p>
                        </div>

                        {/* Browser mockup */}
                        <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200 shadow-xl">
                            {/* Browser chrome */}
                            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="flex gap-1.5">
                                    <span className="size-3 rounded-full bg-slate-200" />
                                    <span className="size-3 rounded-full bg-slate-200" />
                                    <span className="size-3 rounded-full bg-slate-200" />
                                </div>
                                <div className="ml-2 flex-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-400">
                                    tracking.hikyaku.org/booking/tracking
                                </div>
                            </div>

                            {/* Tracking page content */}
                            <div className="bg-white p-6 md:p-8">
                                <div className="mb-3 flex flex-wrap items-center gap-3">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600">
                                        <span className="size-1.5 rounded-full bg-current opacity-70" />
                                        In transit
                                    </span>
                                    <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-500">
                                        HK-04823
                                    </span>
                                </div>
                                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                                    Your delivery is on the way
                                </h3>

                                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                                    {/* Map + driver */}
                                    <div className="space-y-4 lg:col-span-2">
                                        {/* Schematic map */}
                                        <div
                                            className="relative h-52 overflow-hidden rounded-xl bg-slate-100"
                                            aria-hidden
                                        >
                                            <div
                                                className="absolute inset-0"
                                                style={{
                                                    backgroundImage:
                                                        "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
                                                    backgroundSize: "32px 32px",
                                                }}
                                            />
                                            {/* Vertical streets */}
                                            <div className="absolute bottom-0 left-[22%] top-0 w-[2px] bg-slate-300/70" />
                                            <div className="absolute bottom-0 left-[60%] top-0 w-[2px] bg-slate-300/70" />
                                            {/* Horizontal streets */}
                                            <div className="absolute left-0 right-0 top-[38%] h-[2px] bg-slate-300/70" />
                                            <div className="absolute left-0 right-0 top-[68%] h-[2px] bg-slate-300/70" />
                                            {/* Destination */}
                                            <div className="absolute right-[15%] top-[24%] flex flex-col items-center gap-1">
                                                <div className="flex size-6 items-center justify-center rounded-full bg-primary shadow ring-2 ring-white">
                                                    <svg viewBox="0 0 10 14" className="size-3 fill-white">
                                                        <path d="M5 0a5 5 0 0 0-5 5c0 3.5 5 9 5 9s5-5.5 5-9a5 5 0 0 0-5-5Zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
                                                    </svg>
                                                </div>
                                                <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
                                                    2-3 Hitotsubashi
                                                </span>
                                            </div>
                                            {/* Driver dot */}
                                            <div className="absolute left-[36%] top-[50%] flex items-center gap-1.5">
                                                <div className="relative flex size-5 items-center justify-center rounded-full bg-blue-500 shadow ring-2 ring-white">
                                                    <div className="absolute size-5 animate-ping rounded-full bg-blue-400 opacity-50" />
                                                    <svg viewBox="0 0 8 8" className="relative size-3 fill-white">
                                                        <path d="M4 0L8 8H0L4 0Z" />
                                                    </svg>
                                                </div>
                                                <span className="rounded bg-blue-500 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
                                                    Kenji
                                                </span>
                                            </div>
                                            {/* Dashed route line */}
                                            <svg className="absolute inset-0 h-full w-full" aria-hidden>
                                                <line
                                                    x1="39%"
                                                    y1="54%"
                                                    x2="83%"
                                                    y2="30%"
                                                    stroke="#3b82f6"
                                                    strokeWidth="2"
                                                    strokeDasharray="6 4"
                                                    strokeOpacity="0.5"
                                                />
                                            </svg>
                                        </div>

                                        {/* Courier card */}
                                        <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                                                <svg viewBox="0 0 20 14" className="size-5 fill-blue-600">
                                                    <rect x="0" y="3" width="13" height="9" rx="1" />
                                                    <path d="M13 5h4l3 4v3h-7V5Z" />
                                                    <circle cx="4" cy="13" r="2" />
                                                    <circle cx="15" cy="13" r="2" />
                                                </svg>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs text-slate-500">Your courier</p>
                                                <p className="text-sm font-medium text-slate-900">
                                                    Kenji Watanabe
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Hiace Van · ABC-1234 · Updated 9:41 AM
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sidebar: timeline + recipient */}
                                    <aside className="space-y-5">
                                        <div>
                                            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                                                Progress
                                            </p>
                                            <ol className="space-y-3">
                                                {TRACKING_STATUSES.map((s) => (
                                                    <li
                                                        key={s.label}
                                                        className="flex items-start gap-2.5"
                                                    >
                                                        <div
                                                            className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ${
                                                                s.done
                                                                    ? "bg-primary"
                                                                    : s.active
                                                                      ? "bg-blue-500"
                                                                      : "border border-slate-300 bg-white"
                                                            }`}
                                                        >
                                                            {s.done && (
                                                                <svg
                                                                    viewBox="0 0 8 8"
                                                                    className="size-2.5 stroke-white"
                                                                    fill="none"
                                                                    strokeWidth="1.5"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                >
                                                                    <path d="M1 4l2 2 4-4" />
                                                                </svg>
                                                            )}
                                                            {s.active && (
                                                                <span className="size-1.5 rounded-full bg-white" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p
                                                                className={`text-xs font-medium ${
                                                                    s.done || s.active
                                                                        ? "text-slate-900"
                                                                        : "text-slate-400"
                                                                }`}
                                                            >
                                                                {s.label}
                                                            </p>
                                                            {s.time && (
                                                                <p className="text-[11px] text-slate-400">
                                                                    {s.time}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>

                                        <div className="border-t border-slate-100 pt-4">
                                            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                                                Recipient
                                            </p>
                                            <p className="text-sm font-medium text-slate-900">
                                                K. Tanaka
                                            </p>
                                            <p className="mt-0.5 text-xs text-slate-500">
                                                2-3 Hitotsubashi, Chiyoda, Tokyo
                                            </p>
                                        </div>
                                    </aside>
                                </div>
                            </div>
                        </div>
                        <p className="mt-3 text-center text-xs text-slate-400">
                            Sample tracking view — shown here while a parcel is in transit.
                        </p>
                    </div>
                </section>

                {/* Before */}
                <section className="bg-slate-50 px-6 py-20 md:py-24">
                    <div className="mx-auto max-w-5xl">
                        <Eyebrow>Before Hikyaku</Eyebrow>
                        <h2
                            className="mt-4 max-w-3xl font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl"
                            style={{ textWrap: "balance" } as React.CSSProperties}
                        >
                            The calls you field when nobody knows where the van is
                        </h2>
                        <div className="mt-10 grid gap-x-16 gap-y-6 sm:grid-cols-2">
                            <p className="text-base leading-relaxed text-slate-500">
                                A customer rings. They were promised delivery between two and
                                four. It&apos;s half three and nobody has been in touch. You
                                pull up a spreadsheet. The driver&apos;s phone goes to
                                voicemail. You guess: &quot;shouldn&apos;t be long now.&quot;
                            </p>
                            <p className="text-base leading-relaxed text-slate-500">
                                That call takes five minutes. Multiply it across a day of
                                deliveries and a real chunk of your team&apos;s time is spent
                                relaying information a live view would have answered before
                                anyone picked up the phone.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Feature grid */}
                <section className="px-6 py-20 md:py-24">
                    <div className="mx-auto max-w-5xl">
                        <h2
                            className="max-w-2xl font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl"
                            style={{ textWrap: "balance" } as React.CSSProperties}
                        >
                            What the tracking page carries
                        </h2>
                        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-500">
                            One page, built from the same data your dispatch team sees. The
                            recipient gets the full picture; you get fewer interruptions.
                        </p>
                        <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2">
                            {WHAT_IS_ON_THE_PAGE.map((item) => (
                                <div key={item.title} className="border-t border-slate-200 pt-5">
                                    <h3 className="text-base font-bold text-slate-900">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                        {item.body}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Proof of delivery */}
                <section className="bg-slate-50 px-6 py-20 md:py-24">
                    <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
                        <div>
                            <Eyebrow>Proof of delivery</Eyebrow>
                            <h2
                                className="mt-4 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl"
                                style={{ textWrap: "balance" } as React.CSSProperties}
                            >
                                Photos appear the moment the job is done
                            </h2>
                            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-500">
                                Your driver photographs the delivery at the door. Those images
                                appear automatically on the recipient&apos;s tracking page once
                                the status moves to delivered. No email attachment, no chase —
                                the evidence is already there when anyone looks.
                            </p>
                            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-500">
                                The same photos are visible in your dashboard too, so any
                                delivery query is a single lookup away.
                            </p>
                        </div>

                        {/* Proof of delivery mockup */}
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                            <div className="mb-4 flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
                                    <span className="size-1.5 rounded-full bg-current opacity-70" />
                                    Delivered
                                </span>
                                <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-500">
                                    HK-04821
                                </span>
                            </div>
                            <h3 className="text-base font-semibold text-slate-900">Delivered</h3>
                            <p className="mt-0.5 text-sm text-slate-500">Today at 9:58 AM · Aoki Books, Chiyoda</p>

                            <div className="mt-5">
                                <p className="mb-3 text-sm font-medium text-slate-700">
                                    Proof of delivery
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-2 row-span-2 aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
                                        <div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-100" />
                                    </div>
                                    <div className="aspect-square overflow-hidden rounded-lg bg-slate-100">
                                        <div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-100" />
                                    </div>
                                    <div className="aspect-square overflow-hidden rounded-lg bg-slate-100">
                                        <div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-100" />
                                    </div>
                                </div>
                                <p className="mt-2.5 text-xs text-slate-400">
                                    3 photos · Taken by Kenji Watanabe
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="px-6 pb-24 pt-20">
                    <div className="mx-auto max-w-6xl rounded-2xl bg-slate-900 px-8 py-14 text-center md:py-16">
                        <h2
                            className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-white md:text-4xl"
                            style={{ textWrap: "balance" } as React.CSSProperties}
                        >
                            Turn every tracking number into a live delivery window
                        </h2>
                        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-300">
                            Open source and self-hostable. Your recipients see the same data
                            your dispatch team does.
                        </p>
                        <Link
                            href="/auth/signup"
                            className="mt-8 inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        >
                            Start free trial
                        </Link>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    );
}
