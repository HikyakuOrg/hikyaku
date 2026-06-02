import { BRAND, DEPOT, STOPS, ROUTE_SUMMARY } from "@/components/plan-routes-data"
import { PlanRoutesMapWrapper } from "@/components/plan-routes-map-wrapper"

export function PlanRoutesShowcase() {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="grid lg:grid-cols-[330px_1fr]">
                {/* Manifest panel */}
                <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
                    <div className="flex items-baseline justify-between">
                        <h3 className="text-sm font-bold text-slate-900">Monday&apos;s run</h3>
                        <span className="text-xs text-slate-400">{ROUTE_SUMMARY}</span>
                    </div>

                    <ol className="mt-4 space-y-0">
                        {/* Depot */}
                        <li className="relative flex gap-3 pb-4">
                            <span className="absolute left-[14px] top-7 h-[calc(100%-1rem)] border-l border-dashed border-slate-200" />
                            <span className="z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900">
                                <span className="h-2 w-2 rounded-full bg-white" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                    <p className="truncate text-sm font-medium text-slate-900">{DEPOT.name}</p>
                                    <span className="shrink-0 text-xs text-slate-400">depart {DEPOT.depart}</span>
                                </div>
                                <p className="truncate text-xs text-slate-500">{DEPOT.address}</p>
                            </div>
                        </li>

                        {/* Stops */}
                        {STOPS.map((s, i) => (
                            <li key={s.n} className="relative flex gap-3 pb-4 last:pb-0">
                                {i < STOPS.length - 1 && (
                                    <span className="absolute left-[14px] top-7 h-[calc(100%-1rem)] border-l border-dashed border-slate-200" />
                                )}
                                <span
                                    className="z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                    style={{ background: BRAND }}
                                >
                                    {s.n}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <p className="truncate text-sm font-medium text-slate-900">{s.name}</p>
                                        <span className="shrink-0 text-xs font-medium text-slate-700">{s.eta}</span>
                                    </div>
                                    <p className="truncate text-xs text-slate-500">
                                        {s.address} · {s.window}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* Live route map */}
                <div className="relative min-h-[380px] bg-slate-100 lg:min-h-[560px]">
                    <PlanRoutesMapWrapper />
                </div>
            </div>
        </div>
    )
}
