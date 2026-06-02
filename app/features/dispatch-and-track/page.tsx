import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { DispatchRunMapWrapper } from "./dispatch-run-map-wrapper"
import {
    DispatchStopsDemo,
    TrackingTrailDemo,
    StatusTimelineDemo,
} from "./feature-demos"

export const metadata: Metadata = {
    title: "Dispatch & tracking — Hikyaku",
    description:
        "Send a driver their route, then follow every stop on a live map. Dispatch and real-time tracking in one place.",
}

function Eyebrow({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {children}
        </p>
    )
}

export default function Page() {
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
                    <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
                        <div>
                            <Eyebrow>Dispatch &amp; tracking</Eyebrow>
                            <h1
                                className="mt-5 font-[family-name:var(--font-display)] text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 md:text-5xl lg:text-6xl"
                                style={{ textWrap: "balance" } as React.CSSProperties}
                            >
                                Send the route. <span className="text-primary">Track every stop.</span>
                            </h1>
                            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-500">
                                Hand a driver their day, push the route to their phone, and
                                watch each delivery land on a live map. When a customer asks
                                where their parcel is, the answer is already on your screen.
                            </p>
                            <div className="mt-8 flex flex-wrap items-center gap-3">
                                <Link
                                    href="/auth/signup"
                                    className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                                >
                                    Get started
                                </Link>
                                <Link
                                    href="/auth/login"
                                    className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                                >
                                    See the dashboard
                                </Link>
                            </div>
                        </div>

                        <div className="lg:pl-4">
                            <div className="relative h-[380px] overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-slate-200 shadow-xl md:h-[460px]">
                                <DispatchRunMapWrapper />
                            </div>
                            <p className="mt-3 text-xs text-slate-400">
                                Live demo with sample data — a driver working a real Tokyo
                                route, stops marking off as they pass.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Before — the clipboard in the cab */}
                <section className="bg-slate-50 px-6 py-20 md:py-24">
                    <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
                        <div className="relative order-last lg:order-first">
                            <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200 shadow-xl">
                                <Image
                                    src="/driver-pen-paper.jpg"
                                    alt="A delivery driver parked at the kerb, balancing a parcel on the steering wheel while filling out a paper run sheet by hand"
                                    width={1200}
                                    height={800}
                                    sizes="(min-width: 1024px) 40rem, 100vw"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div className="absolute -bottom-4 -right-3 hidden rotate-2 rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ring-slate-200 sm:block">
                                <p className="text-xs font-semibold text-slate-900">Dispatch sees this</p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    …tomorrow, once the sheet comes back
                                </p>
                            </div>
                        </div>
                        <div>
                            <Eyebrow>Before Hikyaku</Eyebrow>
                            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                                The run sheet lived on the dashboard
                            </h2>
                            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-500">
                                A clipboard balanced on the steering wheel, stops ticked off
                                in biro, signatures scrawled in the margin. The driver knows
                                how the day is going — nobody back at base does, not until the
                                paper comes in and someone keys it into a spreadsheet.
                            </p>
                            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-500">
                                When a customer rings to ask where their parcel is, the honest
                                answer is a shrug. Everything below replaces that clipboard.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Dispatch */}
                <section className="px-6 py-20 md:py-24">
                    <div className="mx-auto grid max-w-7xl items-start gap-12 lg:grid-cols-2 lg:gap-16">
                        <div className="lg:pt-6">
                            <Eyebrow>Dispatch</Eyebrow>
                            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                                Build the run, then send it once
                            </h2>
                            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-500">
                                Drag parcels into the order you want, or let the route
                                optimise itself around each delivery window. One action sends
                                the finished run to the driver&apos;s app — every stop in
                                sequence, addressed and ready, with a proof-of-delivery prompt
                                waiting at each door.
                            </p>
                            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-500">
                                Plans change mid-shift. Reorder or drop a stop and the route
                                updates on the next sync — while anything already delivered or
                                in transit stays locked, so finished work never gets reshuffled
                                by accident.
                            </p>
                        </div>
                        <div className="lg:pl-4">
                            <DispatchStopsDemo />
                        </div>
                    </div>
                </section>

                {/* Live tracking */}
                <section className="bg-slate-50 px-6 py-20 md:py-24">
                    <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
                        <div className="order-last lg:order-first">
                            <TrackingTrailDemo />
                        </div>
                        <div>
                            <Eyebrow>Live tracking</Eyebrow>
                            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                                Every driver on one map
                            </h2>
                            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-500">
                                Driver locations stream in as they move, so dispatch watches
                                the whole fleet at a glance and catches a run slipping behind
                                before the customer feels it. Open any driver to replay where
                                they&apos;ve been and see what&apos;s still ahead of them.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Status */}
                <section className="px-6 py-20 md:py-24">
                    <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
                        <div>
                            <Eyebrow>Status</Eyebrow>
                            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                                Statuses that keep themselves current
                            </h2>
                            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-500">
                                Each scan and stop moves the parcel along on its own — pending,
                                assigned, in transit, delivered — stamped with the time it
                                happened. The same record drives the tracking page your
                                recipients open, so what they see is exactly what you see.
                            </p>
                        </div>
                        <div className="lg:pl-4">
                            <StatusTimelineDemo />
                        </div>
                    </div>
                </section>

                {/* Close */}
                <section className="border-t border-slate-100 px-6 py-20">
                    <div className="mx-auto max-w-3xl text-center">
                        <h2
                            className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl"
                            style={{ textWrap: "balance" }}
                        >
                            Run your next delivery day on Hikyaku
                        </h2>
                        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-500">
                            Open source and self-hostable. Start with your own fleet and grow
                            from there.
                        </p>
                        <div className="mt-8 flex items-center justify-center gap-3">
                            <Link
                                href="/auth/signup"
                                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                            >
                                Get started
                            </Link>
                            <Link
                                href="/features/plan-routes"
                                className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                            >
                                Plan routes
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    )
}
