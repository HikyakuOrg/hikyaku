'use client'

import { useSyncExternalStore } from 'react'

import { cn } from '@/lib/utils'
import { getLastAuthMethod, type AuthMethod } from '@/lib/auth/last-used'

function subscribe(onStoreChange: () => void) {
  // `storage` fires when a *different* tab writes, so signing in elsewhere
  // updates this page's badge without a reload.
  window.addEventListener('storage', onStoreChange)
  return () => window.removeEventListener('storage', onStoreChange)
}

/**
 * The last sign-in method, from localStorage. Null on the server, so the badge
 * appears after hydration. It is absolutely positioned so the form does not move.
 */
export function useLastAuthMethod(): AuthMethod | null {
  return useSyncExternalStore(subscribe, getLastAuthMethod, () => null)
}

/**
 * Marks the method this device used last. Needs a `relative` parent.
 * `pointer-events-none` lets clicks reach the Google iframe below.
 */
export function LastUsedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'bg-primary text-primary-foreground pointer-events-none absolute -top-2 end-3 z-10 rounded-full px-2 py-0.5 text-[10px] font-medium shadow-xs',
        className
      )}
    >
      Last used
    </span>
  )
}
