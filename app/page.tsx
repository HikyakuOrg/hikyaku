import Image from "next/image";
import Link from "next/link";
import { HeroMapWrapper } from "@/components/hero-map-wrapper";
import {
    PackageIcon,
    TruckIcon,
    ChartLineUpIcon,
    ArrowRightIcon,
    NavigationArrowIcon,
    MapPinIcon,
    UsersIcon,
} from "@phosphor-icons/react/dist/ssr";

import { PathIcon } from "@phosphor-icons/react/dist/ssr/Path";
import { PersonSimpleRunIcon } from "@phosphor-icons/react/dist/ssr/PersonSimpleRun";
import { BroadcastIcon } from "@phosphor-icons/react/dist/ssr/Broadcast";

export default function Page() {
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans">
            <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
                <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <span className="flex flex-col leading-none">
                        <span className="text-[10px] font-medium tracking-[0.25em] text-slate-400">飛脚</span>
                        <span className="text-xl font-extrabold tracking-tight text-slate-900">
                            Hikyaku
                        </span>
                    </span>
                    <ul className="hidden gap-8 text-sm font-medium text-slate-600 md:flex">
                        {/* {["Platform", "Features", "Pricing", "Docs"].map((item) => (
                            <li key={item}>
                                <Link
                                    href={item === "Docs" ? "/docs" : `#${item.toLowerCase()}`}
                                    className="transition-colors hover:text-slate-900"
                                >
                                    {item}
                                </Link>
                            </li>
                        ))} */}
                    </ul>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/auth/login"
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90"
                        >
                            Get Started
                        </Link>
                    </div>
                </nav>
            </header>

            <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-primary/90 px-6 py-24 text-white md:py-36">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-10"
                    style={{
                        backgroundImage:
                            "linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)",
                        backgroundSize: "48px 48px",
                    }}
                />

                <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
                    {/* left */}
                    <div>
                        <h1 className="mt-4 text-5xl font-extrabold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
                            DELIVER ON TIME.{" "}
                            <span className="text-amber-400">EVERY TIME.</span>
                        </h1>
                        <p className="mt-6 max-w-lg text-lg text-slate-300">
                            Hikyaku synchronises your entire logistics operation — packages,
                            drivers, fleet, and customers — in a single intelligent platform.
                            Rooted in the spirit of Japan&apos;s Edo-period relay runners.
                            Modern speed, complete visibility.
                        </p>
                    </div>

                    <div className="relative hidden h-[440px] overflow-hidden rounded-2xl border border-white/10 shadow-2xl lg:block">
                        <HeroMapWrapper />
                    </div>
                </div>
            </section>

            <section className="bg-white px-6 py-20">
                <div className="mx-auto max-w-5xl">
                    <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                        Our Modern Relay System
                    </h2>

                    <div className="mt-14 flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-0">

                        <div className="flex flex-1 flex-col items-center text-center">
                            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5 text-primary shadow-sm overflow-hidden">
                                <Image
                                    src="/hikyaku_kneeling.png"
                                    alt="Smart Routing"
                                    width={70}
                                    height={70}
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <h3 className="mt-1 text-lg font-extrabold text-slate-900">Smart Routing</h3>
                            <p className="mt-2 max-w-[200px] text-sm leading-relaxed text-slate-500">
                                Routing that adapts in real time to traffic and delivery windows.
                            </p>
                        </div>

                        <div className="flex flex-col items-center justify-center self-stretch md:mt-12">
                            <ArrowRightIcon
                                size={20}
                                weight="bold"
                                className="hidden text-amber-400 md:block"
                            />
                        </div>

                        <div className="flex flex-1 flex-col items-center text-center">
                            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-amber-400/20 bg-amber-400/5 text-amber-500 shadow-sm overflow-hidden">
                                <Image
                                    src="/hikyaku_with_boxes.png"
                                    alt="Real-Time Visibility"
                                    width={80}
                                    height={80}
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <h3 className="mt-1 text-lg font-extrabold text-slate-900">Real-Time Visibility</h3>
                            <p className="mt-2 max-w-[200px] text-sm leading-relaxed text-slate-500">
                                Live GPS tracking gives dispatchers a single source of truth — to the minute.
                            </p>
                        </div>

                        <div className="flex flex-col items-center justify-center self-stretch md:mt-12">
                            <ArrowRightIcon
                                size={20}
                                weight="bold"
                                className="hidden text-amber-400 md:block"
                            />
                        </div>

                        <div className="flex flex-1 flex-col items-center text-center">
                            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5 text-primary shadow-sm overflow-hidden">
                                <Image
                                    src="/hikyaku_back_facing.png"
                                    alt="Fleet Synchronisation"
                                    width={50}
                                    height={50}
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <h3 className="mt-1 text-lg font-extrabold text-slate-900">Fleet Synchronisation</h3>
                            <p className="mt-2 max-w-[200px] text-sm leading-relaxed text-slate-500">
                                Every vehicle, shift, and delivery window synced and accounted for across your operation.
                            </p>
                        </div>

                    </div>
                </div>
            </section>

            <section id="platform" className="bg-slate-50 px-6 py-20">
                <div className="mx-auto max-w-7xl">
                    <p className="text-center text-xs font-bold uppercase tracking-widest text-black">
                        How It Works
                    </p>

                    <div className="mt-14 grid gap-8 md:grid-cols-3">
                        {[
                            {
                                icon: <NavigationArrowIcon size={28} weight="duotone" />,
                                title: "Smart Routing",
                                desc: "AI-optimised route planning reduces drive time and fuel costs automatically, adapting in real time to traffic and delivery windows.",
                            },
                            {
                                icon: <MapPinIcon size={28} weight="duotone" />,
                                title: "Real-Time Visibility",
                                desc: "Live GPS tracking and Supabase-powered realtime channels give dispatchers a single source of truth — down to the minute.",
                            },
                            {
                                icon: <TruckIcon size={28} weight="duotone" />,
                                title: "Fleet Synchronisation",
                                desc: "VIN-decoded vehicle profiles, maintenance windows, and driver-shift matching keep your fleet running at full capacity.",
                            },
                        ].map(({ icon, title, desc }) => (
                            <div key={title} className="relative rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
                                <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                                    {icon}
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="features" className="px-6 py-20">
                <div className="mx-auto max-w-7xl">
                    <p className="text-center text-xs font-bold uppercase tracking-widest text-primary">
                        Features
                    </p>
                    <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                        Everything Your Operation Needs
                    </h2>
                    <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[
                            {
                                icon: <PackageIcon size={24} weight="duotone" />,
                                title: "Package Management",
                                desc: "Guided intake stepper, dimensional tracking, delivery-window scheduling, and photo proof-of-delivery — all in one flow.",
                            },
                            {
                                icon: <UsersIcon size={24} weight="duotone" />,
                                title: "Driver Shift Tracking",
                                desc: "Assign shifts, track live positions via Supabase realtime, and review full route-step histories after every run.",
                            },
                            {
                                icon: <TruckIcon size={24} weight="duotone" />,
                                title: "Fleet Management",
                                desc: "Auto-fill vehicle details from VIN, manage maintenance schedules, and keep utilisation metrics front and centre.",
                            },
                            {
                                icon: <ChartLineUpIcon size={24} weight="duotone" />,
                                title: "Performance Analytics",
                                desc: "On-time rates, relay times, and customer satisfaction scores surfaced in an at-a-glance dashboard.",
                            },
                            {
                                icon: <NavigationArrowIcon size={24} weight="duotone" />,
                                title: "Live Map & Route Steps",
                                desc: "OpenRouteService geometry rendered on MapLibre maps so dispatchers see exactly where every driver is headed.",
                            },
                            {
                                icon: <MapPinIcon size={24} weight="duotone" />,
                                title: "Customer Portal",
                                desc: "Full customer profiles, package histories, and communication logs — searchable and filter-ready.",
                            },
                        ].map(({ icon, title, desc }) => (
                            <div
                                key={title}
                                className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                            >
                                <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                                    {icon}
                                </div>
                                <h3 className="font-bold text-slate-900">{title}</h3>
                                <p className="mt-1 text-sm leading-relaxed text-slate-500">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-primary px-6 py-14">
                <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 text-center md:grid-cols-4">
                    {[
                        { value: "99.1%", label: "Uptime SLA" },
                        { value: "2.1 hrs", label: "Avg. Delivery Window" },
                        { value: "Zero", label: "Vendor Lock-In" },
                        { value: "Open", label: "Source & Auditable" },
                    ].map(({ value, label }) => (
                        <div key={label}>
                            <p className="text-4xl font-extrabold text-white">{value}</p>
                            <p className="mt-1 text-sm font-medium text-primary-foreground/70">{label}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="px-6 py-20 text-center text-white">
                <p className="text-sm font-medium tracking-[0.3em] text-slate-400">いつでも、どこでも</p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-black md:text-4xl">
                    Start delivering smarter today.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-slate-400">
                    Hikyaku is open source, self-hostable, and free to start.
                    Join operations teams who trust their logistics to a platform they can actually own.
                </p>
                <Link
                    href="/auth/login"
                    className="mt-8 inline-flex items-center gap-2 rounded-lg bg-black px-8 py-4 text-sm font-bold text-white shadow-lg transition-colors"
                >
                    Get Started Free <ArrowRightIcon weight="bold" size={16} />
                </Link>
            </section>

            <footer className="border-t border-slate-100 bg-white px-6 py-10">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-400 md:flex-row">
                    <span className="flex flex-col leading-none">
                        <span className="text-[9px] font-medium tracking-[0.25em] text-slate-400">飛脚</span>
                        <span className="font-bold text-slate-900">Hikyaku</span>
                    </span>
                    <div className="flex gap-6">
                        <Link href="#" className="hover:text-slate-900">Privacy</Link>
                        <Link href="#" className="hover:text-slate-900">Terms</Link>
                        <Link href="/auth/login" className="hover:text-slate-900">Dashboard</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
