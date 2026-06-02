import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PlanRoutesShowcase } from "@/components/plan-routes-showcase";

export const metadata: Metadata = {
    title: "Plan routes — Hikyaku",
    description:
        "Bring in your stops, set the windows that matter, and let Hikyaku order them into one efficient run from the depot. Send it straight to the driver app.",
};

const STEPS = [
    {
        n: "01",
        title: "Bring in the stops",
        body: "Upload a spreadsheet, add them by hand, or let orders arrive from your booking page. Each one keeps its address and promised time.",
    },
    {
        n: "02",
        title: "Set what's fixed",
        body: "Where the van starts and ends, how much it carries, and the window each recipient was promised.",
    },
    {
        n: "03",
        title: "Optimise and send",
        body: "Hikyaku orders the stops into the shortest workable run and pushes it to the driver app, turn by turn.",
    },
];

const FACTORS = [
    {
        title: "Delivery windows",
        body: "Every stop lands inside the time its recipient was promised — not just somewhere on the route.",
    },
    {
        title: "Depot start and return",
        body: "The run begins and ends where the van actually does, so the first and last legs count.",
    },
    {
        title: "What the van carries",
        body: "Stops are ordered against vehicle capacity, so a route never asks for more than fits.",
    },
    {
        title: "Changes mid-plan",
        body: "Drag a stop, drop one, or add a late order — the rest of the run re-times around it.",
    },
];

export default function PlanRoutesPage() {
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans">
            <SiteHeader />

            <main>
                {/* Hero */}
                <section className="relative overflow-hidden px-6 pt-20 pb-12 md:pt-28">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{
                            backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
                            backgroundSize: "28px 28px",
                            opacity: 0.35,
                        }}
                    />
                    <div className="relative mx-auto max-w-3xl text-center">
                        <p className="text-xs font-bold uppercase tracking-widest text-primary">
                            Route planning
                        </p>
                        <h1
                            className="mt-4 font-[family-name:var(--font-display)] text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-5xl lg:text-6xl"
                            style={{ textWrap: "balance" }}
                        >
                            Sequence the whole day before the first van leaves
                        </h1>
                        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-500">
                            Bring in your stops, set the windows that matter, and Hikyaku orders them
                            into one efficient run — out from the depot, through every drop. Then it
                            goes straight to the driver app.
                        </p>
                        <div className="mt-8 flex items-center justify-center gap-4">
                            <Link
                                href="/auth/signup"
                                className="inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                            >
                                Start free trial
                            </Link>
                            <Link
                                href="#how"
                                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                            >
                                See how it works
                                <ArrowRightIcon size={14} weight="bold" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Showcase */}
                <section className="px-6 pb-20">
                    <div className="mx-auto max-w-6xl">
                        <PlanRoutesShowcase />
                        <p className="mt-3 text-center text-sm text-slate-400">
                            A sample run — six drops across Asakusa, ordered from the depot.
                        </p>
                    </div>
                </section>

                {/* How it works */}
                <section id="how" className="scroll-mt-20 bg-slate-50 px-6 py-20">
                    <div className="mx-auto max-w-5xl">
                        <h2
                            className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl"
                            style={{ textWrap: "balance" }}
                        >
                            From a list to a route
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

                {/* What it weighs */}
                <section className="px-6 py-20">
                    <div className="mx-auto max-w-5xl">
                        <h2
                            className="max-w-2xl font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl"
                            style={{ textWrap: "balance" }}
                        >
                            What the optimiser weighs
                        </h2>
                        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-500">
                            The shortest route on paper isn&apos;t always the one you can run. Hikyaku
                            balances the things that decide whether a day actually finishes on time.
                        </p>
                        <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2">
                            {FACTORS.map((f) => (
                                <div key={f.title} className="border-t border-slate-200 pt-5">
                                    <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.body}</p>
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
                            Plan your first route today
                        </h2>
                        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-300">
                            Open source and self-hostable. Bring a day of stops and watch them fall
                            into order.
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
