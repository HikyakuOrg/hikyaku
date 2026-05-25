"use client"

import { useEffect, useRef } from "react"

type UseInfiniteScrollOptions = {
    onLoadMore: () => void
    /** Stop observing while loading or when there's nothing left to load. */
    disabled?: boolean
    /** Prefetch margin around the root (default 200px). */
    rootMargin?: string
}

/**
 * Returns a ref to attach to a sentinel element at the end of a list. When that
 * sentinel scrolls into view, `onLoadMore` fires. The callback is held in a ref
 * so the observer is not recreated on every render; only `disabled`/`rootMargin`
 * changes rebuild it. The observer disconnects on cleanup.
 *
 * Uses the default (viewport) root, so the scroll container must sit within the
 * viewport — see warehouse-list-panel.tsx (plain overflow-y-auto, bounded height).
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>({
    onLoadMore,
    disabled = false,
    rootMargin = "200px",
}: UseInfiniteScrollOptions) {
    const sentinelRef = useRef<T | null>(null)
    const onLoadMoreRef = useRef(onLoadMore)
    onLoadMoreRef.current = onLoadMore

    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel || disabled) {
            return
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    onLoadMoreRef.current()
                }
            },
            { rootMargin }
        )

        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [disabled, rootMargin])

    return sentinelRef
}
