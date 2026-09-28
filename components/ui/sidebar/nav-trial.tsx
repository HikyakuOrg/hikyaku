"use client"

import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar"
import type { TrialStatus } from "@/lib/actions/billing"
import { formatDaysRemaining, formatTrialEnd } from "@/lib/trial"
import { ClockIcon } from "@phosphor-icons/react"

/**
 * Trial countdown in the sidebar footer. Shown only while the trial is active;
 * after it ends, the trial dialog shows instead.
 */
export function NavTrial({ trial }: { trial: TrialStatus | null }) {
  if (!trial || trial.state !== "active" || !trial.trialEndsAt) return null

  const endsAt = formatTrialEnd(trial.trialEndsAt)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/* Not a button: there is nothing to open yet. */}
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sidebar-foreground/70">
          <ClockIcon className="size-4 shrink-0" />
          {/* The text hides when the sidebar collapses; the icon stays. */}
          <div className="grid flex-1 text-start leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-xs font-medium">
              Trial · {formatDaysRemaining(trial.daysRemaining ?? 0)}
            </span>
            {/* title= shows the full date when the text is cut off. */}
            <span className="truncate text-xs" title={endsAt}>
              Ends {endsAt}
            </span>
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
