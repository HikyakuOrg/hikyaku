import Link from "next/link";
import {
    ChartLineUpIcon,
    NavigationArrowIcon,
    CaretDownIcon,
    SparkleIcon,
    WifiHighIcon,
} from "@phosphor-icons/react/dist/ssr";
import { GithubStarButton } from "@/components/github-star-button";

const MENU_ITEMS = [
    {
        icon: <NavigationArrowIcon size={20} weight="duotone" />,
        title: "Plan routes",
        desc: "Create & optimise",
        href: "/features/plan-routes",
    },
    {
        icon: <SparkleIcon size={20} weight="duotone" />,
        title: "Delight recipients",
        desc: "Notifications & tracking",
        href: "/features/notifications-and-track",
    },
    {
        icon: <WifiHighIcon size={20} weight="duotone" />,
        title: "Manage delivery",
        desc: "Track drivers in real time",
        href: "/features/dispatch-and-track",
    },
    {
        icon: <ChartLineUpIcon size={20} weight="duotone" />,
        title: "Improve operations",
        desc: "Issue Fuel Cards",
        href: "/features/fuel-card",
    },
];

export function SiteHeader() {
    return (
        <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
            <nav
                aria-label="Main navigation"
                className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"
            >
                {/* Wordmark */}
                <Link
                    href="/"
                    className="flex flex-col leading-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                    <span className="text-[10px] font-medium tracking-[0.25em] text-slate-400">飛脚</span>
                    <span className="text-xl font-extrabold tracking-tight text-slate-900">Hikyaku</span>
                </Link>

                {/* Nav links */}
                <ul className="hidden gap-8 text-sm font-medium text-slate-600 md:flex items-center">
                    {/* Product with mega-menu dropdown */}
                    <li className="relative group">
                        <Link
                            href="/#features"
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
                                    {MENU_ITEMS.map(({ icon, title, desc, href }) => (
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
                            href="/#platform"
                            className="rounded transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        >
                            Resources
                        </Link>
                    </li>
                </ul>

                <div className="flex items-center gap-3">
                    <GithubStarButton />
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
    );
}
