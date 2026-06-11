"use client"

import { useState } from "react";
import Link from "next/link";
import {
    ChartLineUpIcon,
    NavigationArrowIcon,
    SparkleIcon,
    WifiHighIcon,
    ListIcon,
} from "@phosphor-icons/react";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";

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

export function MobileNav() {
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
                className="md:hidden flex items-center justify-center rounded-lg p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                aria-label="Open menu"
            >
                <ListIcon size={22} />
            </SheetTrigger>

            <SheetContent
                side="right"
                className="w-[300px] sm:w-[360px] p-0"
                showCloseButton={true}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-slate-100">
                        <Link
                            href="/"
                            className="flex flex-col leading-none"
                            onClick={close}
                        >
                            <span className="text-[10px] font-medium tracking-[0.25em] text-slate-400">飛脚</span>
                            <span className="text-xl font-extrabold tracking-tight text-slate-900">Hikyaku</span>
                        </Link>
                    </div>

                    {/* Nav links */}
                    <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3 px-2">Product</p>
                            <div className="space-y-1">
                                {MENU_ITEMS.map(({ icon, title, desc, href }) => (
                                    <Link
                                        key={title}
                                        href={href}
                                        onClick={close}
                                        className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50"
                                    >
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
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

                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-2">More</p>
                            <Link
                                href="/#platform"
                                onClick={close}
                                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                            >
                                Resources
                            </Link>
                        </div>
                    </nav>

                    {/* CTA buttons */}
                    <div className="px-4 pb-6 pt-4 border-t border-slate-100 space-y-2">
                        <Link
                            href="/auth/login"
                            onClick={close}
                            className="flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                            Log in
                        </Link>
                        <Link
                            href="/auth/signup"
                            onClick={close}
                            className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                        >
                            Start free trial
                        </Link>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
