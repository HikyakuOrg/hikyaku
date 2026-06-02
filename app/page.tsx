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
    PersonIcon,
    CaretDownIcon,
    SparkleIcon,
    WifiHighIcon,
} from "@phosphor-icons/react/dist/ssr";
import { LandingStepper } from "./stepper/landing-stepper";

export default function Page() {
    

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans">

            <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
                <nav
                    aria-label="Main navigation"
                    className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"
                >
                    {/* Wordmark */}
                    <Link href="/" className="flex flex-col leading-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                        <span className="text-[10px] font-medium tracking-[0.25em] text-slate-400">飛脚</span>
                        <span className="text-xl font-extrabold tracking-tight text-slate-900">Hikyaku</span>
                    </Link>

                    {/* Nav links */}
                    <ul className="hidden gap-8 text-sm font-medium text-slate-600 md:flex items-center">
                        {/* Product with mega-menu dropdown */}
                        <li className="relative group">
                            <Link
                                href="#features"
                                className="flex items-center gap-1 rounded transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                            >
                                Product
                                <CaretDownIcon size={12} weight="bold" className="transition-transform duration-200 group-hover:rotate-180" />
                            </Link>

                            {/* Dropdown panel */}
                            <div className="pointer-events-none invisible opacity-0 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 absolute left-1/2 -translate-x-1/2 top-full pt-3 transition-all duration-150 z-50">
                                <div className="w-[460px] rounded-2xl border border-slate-100 bg-white shadow-xl p-6">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">Main Features</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            {
                                                icon: <NavigationArrowIcon size={20} weight="duotone" />,
                                                title: "Plan routes",
                                                desc: "Create & optimise",
                                                href: "#features",
                                            },
                                            {
                                                icon: <SparkleIcon size={20} weight="duotone" />,
                                                title: "Delight recipients",
                                                desc: "Notifications & tracking",
                                                href: "#features",
                                            },
                                            {
                                                icon: <WifiHighIcon size={20} weight="duotone" />,
                                                title: "Manage delivery",
                                                desc: "Track drivers in real time",
                                                href: "#features",
                                            },
                                            {
                                                icon: <ChartLineUpIcon size={20} weight="duotone" />,
                                                title: "Improve operations",
                                                desc: "Issue Fuel Cards",
                                                href: "#features",
                                            },
                                        ].map(({ icon, title, desc, href }) => (
                                            <Link
                                                key={title}
                                                href={href}
                                                className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-slate-50"
                                            >
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                                    {icon}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 text-sm">{title}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </li>

                        <li>
                            <Link
                                href="#platform"
                                className="rounded transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                            >
                                Resources
                            </Link>
                        </li>
                    </ul>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/auth/login"
                            className="hidden sm:inline-flex rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        >
                            Log in
                        </Link>
                        <Link
                            href="/auth/signup"
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        >
                            Start free trial
                        </Link>
                    </div>
                </nav>
            </header>

            <main>

                <section className="relative overflow-hidden bg-white px-6 py-24 md:py-32">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{
                            backgroundImage:
                                "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
                            backgroundSize: "28px 28px",
                            opacity: 0.35,
                        }}
                    />

                    <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
                        <div>
                            <h1
                                className="animate-fade-up animation-delay-150 mt-5 font-[family-name:var(--font-display)] text-5xl font-extrabold leading-[1.08] tracking-tight text-slate-900 md:text-6xl lg:text-7xl"
                                style={{ textWrap: "balance" } as React.CSSProperties}
                            >
                                The open{" "}
                                <span className="text-primary">operating system</span>
                                {" "}for delivery teams
                            </h1>

                            <p className="animate-fade-up animation-delay-300 mt-6 max-w-lg text-lg leading-relaxed text-slate-500">
                                Your <span className="underline decoration-slate-300 underline-offset-2">dispatcher dashboard</span>,{" "}
                                <span className="underline decoration-slate-300 underline-offset-2">driver app</span>,{" "}
                                <span className="underline decoration-slate-300 underline-offset-2">client portal</span> and{" "}
                                <span className="underline decoration-slate-300 underline-offset-2">delivery tracker</span>.
                                {" "}Open source and self-hostable, all in one.
                            </p>

                            <div className="animate-fade-up animation-delay-450 mt-8">
                                <form
                                    action="/auth/signup"
                                    method="get"
                                    className="flex max-w-md"
                                >
                                    <label htmlFor="hero-email" className="sr-only">
                                        Email
                                    </label>
                                    <input
                                        id="hero-email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        spellCheck={false}
                                        placeholder="Your email"
                                        required
                                        className="h-11 min-w-0 flex-1 rounded-l-lg border border-r-0 border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0"
                                    />
                                    <button
                                        type="submit"
                                        className="h-11 shrink-0 rounded-r-lg bg-primary px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                                    >
                                        Get started
                                    </button>
                                </form>
                                <p className="mt-2.5 text-xs text-slate-400">
                                    Open source · Self-hostable · Free to start
                                </p>
                            </div>
                        </div>

                        <div className="relative hidden h-[440px] overflow-hidden rounded-2xl ring-1 ring-slate-200 shadow-xl lg:block">
                            <HeroMapWrapper />
                        </div>
                    </div>
                </section>

                <section className="bg-white px-6 py-20">
                    <div className="mx-auto max-w-5xl">
                        <h2
                            className="mt-2 text-center font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl"
                            style={{ textWrap: "balance" }}
                        >
                            Our Modern Relay System
                        </h2>

                        <div className="mt-14 flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-0">

                            <div className="flex flex-1 flex-col items-center text-center">
                                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-primary/20 text-primary">
                                    <Image
                                        src="/hikyaku_kneeling.png"
                                        alt="Smart Routing"
                                        width={70}
                                        height={70}
                                        className="object-contain"
                                        priority
                                    />
                                </div>
                                <h3 className="mt-3 text-lg font-extrabold text-slate-900">Smart Routing</h3>
                                <p className="mt-2 max-w-[200px] text-sm leading-relaxed text-slate-500">
                                    Routing that adapts in real time to traffic and delivery windows.
                                </p>
                            </div>

                            <div className="flex flex-col items-center justify-center self-stretch md:mt-12">
                                <ArrowRightIcon
                                    size={20}
                                    weight="bold"
                                    className="hidden text-primary md:block"
                                />
                            </div>

                            <div className="flex flex-1 flex-col items-center text-center">
                                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-primary/2 text-primary">
                                    <Image
                                        src="/hikyaku_with_boxes.png"
                                        alt="Real-Time Visibility"
                                        width={90}
                                        height={80}
                                        className="object-contain"
                                        priority
                                    />
                                </div>
                                <h3 className="mt-3 text-lg font-extrabold text-slate-900">Real-Time Visibility</h3>
                                <p className="mt-2 max-w-[200px] text-sm leading-relaxed text-slate-500">
                                    Live GPS tracking gives dispatchers a single source of truth — to the minute.
                                </p>
                            </div>

                            <div className="flex flex-col items-center justify-center self-stretch md:mt-12">
                                <ArrowRightIcon
                                    size={20}
                                    weight="bold"
                                    className="hidden text-primary md:block"
                                />
                            </div>

                            <div className="flex flex-1 flex-col items-center text-center">
                                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-primary/20 text-primary">
                                    <Image
                                        src="/hikyaku_back_facing.png"
                                        alt="Fleet Synchronisation"
                                        width={50}
                                        height={80}
                                        className="object-contain"
                                        priority
                                    />
                                </div>
                                <h3 className="mt-3 text-lg font-extrabold text-slate-900">Fleet Synchronisation</h3>
                                <p className="mt-2 max-w-[200px] text-sm leading-relaxed text-slate-500">
                                    Every vehicle, shift, and delivery window synced across your operation.
                                </p>
                            </div>

                        </div>
                    </div>
                </section>


                <section className="bg-slate-50 px-6 py-20">
                    <div className="mx-auto max-w-7xl">
                        <p className="text-center text-xs font-bold uppercase tracking-widest text-primary">
                            Why Hikyaku?
                        </p>
                        <h2
                            className="mt-4 text-center font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl"
                            style={{ textWrap: "balance" }}>
                            Booking a delivery shouldn&apos;t be complicated
                        </h2>

                        <LandingStepper className="mt-12" />

                        <div className="mt-14 border-default-neutral grid grid-cols-4 gap-x-4 gap-y-8 border-t pt-12 sm:grid-cols-12 sm:gap-x-6">
                            {[
                                {
                                    icon: <PersonIcon size={28} weight="duotone" />,
                                    title: "Clients",
                                    desc: "Businesses or customers upload their orders and track delivery progress using Hikyaku.",
                                },
                                {
                                    icon: <MapPinIcon size={28} weight="duotone" />,
                                    title: "Dispatchers",
                                    desc: "Optimise routes for drivers in just one click using the Dashboard.",
                                },
                                {
                                    icon: <TruckIcon size={28} weight="duotone" />,
                                    title: "Drivers",
                                    desc: "Navigate, deliver efficiently, and collect Proof of Delivery using the driver app",
                                },
                                {
                                    icon: <PackageIcon size={28} weight="duotone" />,
                                    title: "Recipients",
                                    desc: "Track their orders directly using the Tracking Page",
                                },
                            ].map(({ icon, title, desc }) => (
                                <div key={title} className="col-span-full sm:col-span-6 sm:pr-6 lg:col-span-3">
                                    <div className="mb-1.5 flex items-center gap-1.5 lg:gap-2">
                                        {icon}
                                        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                                    </div>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
                
            </main>

            <footer className="border-t border-slate-100 bg-white px-6 py-10">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-400 md:flex-row">
                    <span className="flex flex-col leading-none">
                        <span className="text-[9px] font-medium tracking-[0.25em] text-slate-400">飛脚</span>
                        <span className="font-bold text-slate-900">Hikyaku</span>
                    </span>
                    <div className="flex gap-6">
                        <Link href="#features" className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded">Product</Link>
                        <Link href="#platform" className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded">Resources</Link>
                        <Link href="#" className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded">Privacy</Link>
                        <Link href="#" className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded">Terms</Link>
                        <Link href="/auth/login" className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded">Dashboard</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
