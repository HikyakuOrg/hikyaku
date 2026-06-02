import Image from "next/image";
import { HeroMapWrapper } from "@/components/hero-map-wrapper";
import {
    PackageIcon,
    TruckIcon,
    ArrowRightIcon,
    MapPinIcon,
    PersonIcon,
} from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LandingStepper } from "./landing/stepper/landing-stepper";
import { LandingAccordion } from "./landing/accordion/landing-accordion";

export default function Page() {
    

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans">

            <SiteHeader />

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

                <section className="bg-slate-50 px-6 py-20">
                    <LandingAccordion />
                </section>
            </main>

            <SiteFooter />
        </div>
    );
}
