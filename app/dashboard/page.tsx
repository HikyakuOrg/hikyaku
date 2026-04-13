import { Suspense } from "react";
import {
  getDriversCount,
  getFleetSize,
  getPackagesCount,
  getWarehousesCount,
  getWarehouseSummaries
} from "@/lib/supabase/db-server";
import { getPackages } from "@/lib/supabase/supabase-rpc";
import { DashboardHeader } from "@/components/overview/dashboard-header";
import { DashboardMetrics } from "@/components/overview/dashboard-metrics";
import { RecentPackages } from "@/components/overview/recent-packages";
import { WarehouseSummary } from "@/components/overview/warehouse-summary";
import { OverviewSkeleton } from "@/components/overview/overview-skeleton";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();

  const [
    pendingPackagesCount,
    driversCount,
    fleetSize,
    warehousesCount,
    warehouseSummaries,
    recentPackagesData
  ] = await Promise.all([
    getPackagesCount(["PENDING"]),
    getDriversCount(),
    getFleetSize(),
    getWarehousesCount(),
    getWarehouseSummaries(),
    getPackages(20, 1, undefined, supabase)
  ]);

  const recentPackages = (recentPackagesData as any[] || []).map(pkg => ({
    id: pkg.id,
    tracking_number: pkg.tracking_number,
    from_customer: pkg.from_customer,
    to_customer: pkg.to_customer,
    latest_package_status_text: pkg.latest_package_status_text,
    created_at: pkg.created_at
  }));

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto min-h-screen bg-transparent">
      <DashboardHeader />

      <Suspense fallback={<OverviewSkeleton />}>
        <DashboardMetrics
          pendingPackagesCount={pendingPackagesCount ?? 0}
          driversCount={driversCount ?? 0}
          fleetSize={fleetSize ?? 0}
          warehousesCount={warehousesCount ?? 0}
        />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-8">
          <RecentPackages packages={recentPackages} />
          <WarehouseSummary warehouses={warehouseSummaries} />
        </div>
      </Suspense>
    </div>
  );
}
