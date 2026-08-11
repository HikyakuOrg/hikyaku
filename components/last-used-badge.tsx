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
 * Reads the last-used method from localStorage, which is client-only. The
 * server snapshot is null, so the badge is absent during SSR and first paint
 * and appears on hydration. That is why it renders absolutely positioned: it
 * must not shift the form under it when it shows up.
 *
 * The snapshot is a primitive, so returning a fresh read each render is safe.
 */
export function useLastAuthMethod(): AuthMethod | null {
  return useSyncExternalStore(subscribe, getLastAuthMethod, () => null)
}

/**
 * Corner pill marking the method this device last signed in with. Purely a
 * hint: every other method stays fully usable, since a single account can have
 * several working methods at once (a Google identity and a password, say).
 *
 * Expects a `relative` parent. `pointer-events-none` keeps it from stealing
 * clicks, which matters most over the Google button, where the real control is
 * an iframe underneath.
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
