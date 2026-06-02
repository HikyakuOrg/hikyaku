import type { Metadata } from "next"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import {
    FuelCardStack,
    FuelCardControls,
    FuelActivityPanel,
    IssuingBalancePanel,
} from "@/components/fuel-card-showcase"

export const metadata: Metadata = {
    title: "Fuel cards — Hikyaku",
    description:
        "Issue virtual fuel cards to drivers from the same dashboard you dispatch from. Locked to the pump, capped to a limit you set, with every purchase tied back to the driver who made it.",
}

function Eyebrow({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {children}
        </p>
    )
}

const STEPS = [
    {
        n: "01",
        title: "Verify your business",
        body: "Add your company details once. They're checked in the background — no separate fuel-card application to fill in.",
    },
    {
        n: "02",
        title: "Issuing switches on",
        body: "The moment your account is verified, card issuing turns on for your organisation. Nothing else to wait for.",
    },
    {
        n: "03",
        title: "Issue the first card",
        body: "Pick a driver, set a limit, and the card lands in their wallet. Tie it to a vehicle to track fuel against the van too.",
    },
]

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
                    <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
                        <div>
                            <Eyebrow>Fuel cards</Eyebrow>
                            <h1
                                className="mt-5 font-[family-name:var(--font-display)] text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 md:text-5xl lg:text-6xl"
                                style={{ textWrap: "balance" } as React.CSSProperties}
                            >
                                Fuel cards that <span className="text-primary">only buy fuel</span>
                            </h1>
                            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-500">
                                Issue a virtual card to any driver from the same dashboard you
                                dispatch from. It drops into their phone wallet, taps to pay at
                                the pump, and won&apos;t go through anywhere else. Set the limit
                                once — every purchase lands against the driver who made it.
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

                        <div className="lg:pl-6">
                            <FuelCardStack />
                        </div>
                    </div>
                </section>

                {/* Control */}
                <section className="bg-slate-50 px-6 py-20 md:py-24">
                    <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
                        <div className="order-last lg:order-first">
                            <FuelCardControls />
                        </div>
                        <div>
                            <Eyebrow>Control</Eyebrow>
                            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                                You set the rules before the card is used
                            </h2>
                            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-500">
                                Cap each card by the transaction, the day, the week or the month —
                                or leave it open. Because every card is locked to fuel merchants,
                                it won&apos;t ring up a trolley of groceries on the way out.
                            </p>
                            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-500">
                                Freeze a card the moment a shift ends and unfreeze it next morning.
                                If a phone goes missing, cancel the card for good — the rest of the
                                fleet keeps running.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Visibility — the software */}
                <section className="px-6 py-20 md:py-24">
                    <div className="mx-auto max-w-3xl text-center">
                        <Eyebrow>Visibility</Eyebrow>
                        <h2
                            className="mt-4 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl"
                            style={{ textWrap: "balance" }}
                        >
                            Every purchase, against the right driver
                        </h2>
                        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-500">
                            Fuel stops appear as they happen — merchant, place, amount and time —
                            tied to the driver and vehicle the card belongs to. No reimbursements
                            to chase, no receipts to collect, nothing to reconcile at month&apos;s end.
                        </p>
                    </div>
                    <div className="mx-auto mt-12 max-w-5xl">
                        <FuelActivityPanel />
                        <p className="mt-3 text-center text-sm text-slate-400">
                            Sample data — a week of fuel across one fleet.
                        </p>
                    </div>
                </section>

                {/* Funding */}
                <section className="bg-slate-50 px-6 py-20 md:py-24">
                    <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
                        <div>
                            <Eyebrow>Funding</Eyebrow>
                            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                                One balance you top up, the whole fleet draws from
                            </h2>
                            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-500">
                                Cards spend from a single issuing balance you fund by bank transfer
                                from your business account. Move money in and it&apos;s ready at the
                                pump — you&apos;re never fronting a third party or waiting on a
                                credit line to clear.
                            </p>
                        </div>
                        <div className="lg:pl-6">
                            <IssuingBalancePanel />
                        </div>
                    </div>
                </section>

                {/* How it switches on */}
                <section className="px-6 py-20 md:py-24">
                    <div className="mx-auto max-w-5xl">
                        <Eyebrow>Getting started</Eyebrow>
                        <h2 className="mt-4 max-w-2xl font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                            From sign-up to first card
                        </h2>
                        <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-3">
                            {STEPS.map((step) => (
                                <div key={step.n}>
                                    <span className="font-[family-name:var(--font-display)] text-4xl font-bold text-slate-200">
                                        {step.n}
                                    </span>
                                    <h3 className="mt-3 text-lg font-bold text-slate-900">{step.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.body}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA band */}
                <section className="px-6 pb-24">
                    <div className="mx-auto max-w-6xl rounded-2xl bg-slate-900 px-8 py-14 text-center md:py-16">
                        <h2
                            className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-white md:text-4xl"
                            style={{ textWrap: "balance" }}
                        >
                            Put the fleet&apos;s fuel on Hikyaku
                        </h2>
                        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-300">
                            Open source and self-hostable. Verify your business and issue the first
                            card today.
                        </p>
                        <div className="mt-8 flex items-center justify-center gap-3">
                            <Link
                                href="/auth/signup"
                                className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                            >
                                Get started
                            </Link>
                            <Link
                                href="/features/dispatch-and-track"
                                className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                            >
                                Dispatch &amp; tracking
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    )
}
