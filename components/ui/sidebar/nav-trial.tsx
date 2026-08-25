"use client"

import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar"
import type { TrialStatus } from "@/lib/actions/billing"
import { formatDaysRemaining, formatTrialEnd } from "@/lib/trial"
import { ClockIcon } from "@phosphor-icons/react"

/**
 * Trial countdown above the user menu in the sidebar footer.
 *
 * Renders nothing when `state` is `none` — personal orgs and pre-trial orgs have
 * no deadline, and an empty "Trial" row would be noise. It also renders nothing
 * once expired: at that point the blocking dialog is on screen saying the same
 * thing far more loudly, so a footer line would only repeat it.
 */
export function NavTrial({ trial }: { trial: TrialStatus | null }) {
  if (!trial || trial.state !== "active" || !trial.trialEndsAt) return null

  const endsAt = formatTrialEnd(trial.trialEndsAt)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/* Not a SidebarMenuButton: there is nowhere to navigate to yet, and a
            button would advertise an interaction that does not exist. */}
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sidebar-foreground/70">
          <ClockIcon className="size-4 shrink-0" />
          {/* The icon stays visible when the rail collapses; the text would
              overflow, so it is hidden the same way the nav sub-items are. */}
          <div className="grid flex-1 text-start leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-xs font-medium">
              Trial · {formatDaysRemaining(trial.daysRemaining ?? 0)}
            </span>
            {/* title= so the full timestamp survives truncation on a narrow rail. */}
            <span className="truncate text-xs" title={endsAt}>
              Ends {endsAt}
            </span>
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
