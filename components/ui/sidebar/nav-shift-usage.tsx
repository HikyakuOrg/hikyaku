"use client"

import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar"
import type { ShiftUsageStatus } from "@/lib/actions/billing"
import { TruckIcon } from "@phosphor-icons/react"

/** Fraction of the free allowance used before the sidebar bothers showing this. */
const WARNING_THRESHOLD = 0.8

/**
 * Shift usage indicator above the user menu, next to NavTrial.
 *
 * Renders nothing under normal use — only once an org is close to or past its
 * free allowance, the same "only show when it matters" restraint NavTrial
 * applies to the trial countdown. Not a button: unlike the trial dialog, the
 * actionable "Add payment method" affordance already lives on the shift-creation
 * flow itself (Overview step), where hitting the limit is actually blocking
 * something — this is only an early warning.
 */
export function NavShiftUsage({ usage }: { usage: ShiftUsageStatus | null }) {
  if (!usage || usage.freeAllowance <= 0) return null

  const fraction = usage.shiftsUsedThisPeriod / usage.freeAllowance
  if (fraction < WARNING_THRESHOLD) return null

  const exhausted = usage.shiftsUsedThisPeriod >= usage.freeAllowance

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div
          className={
            "flex items-center gap-2 rounded-md px-2 py-1.5 " +
            (exhausted && !usage.hasPaymentMethod
              ? "text-destructive"
              : "text-sidebar-foreground/70")
          }
        >
          <TruckIcon className="size-4 shrink-0" />
          <div className="grid flex-1 text-start leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-xs font-medium">
              {usage.shiftsUsedThisPeriod} / {usage.freeAllowance} shifts
            </span>
            <span className="truncate text-xs">
              {exhausted
                ? usage.hasPaymentMethod
                  ? "Billing as overage"
                  : "Free allowance used"
                : "This billing period"}
            </span>
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
