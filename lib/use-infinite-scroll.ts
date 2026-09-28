"use client"

import { useEffect, useRef } from "react"

type UseInfiniteScrollOptions = {
    onLoadMore: () => void
    /** Stop while loading or when there is nothing more to load. */
    disabled?: boolean
    /** Prefetch margin around the root (default 200px). */
    rootMargin?: string
}

/**
 * A ref for an element at the end of a list. `onLoadMore` runs when that
 * element scrolls into view. The root is the viewport, so the scroll container
 * must be inside it (see warehouse-list-panel.tsx).
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>({
    onLoadMore,
    disabled = false,
    rootMargin = "200px",
}: UseInfiniteScrollOptions) {
    const sentinelRef = useRef<T | null>(null)
    const onLoadMoreRef = useRef(onLoadMore)

    // Write the ref outside render. The observer reads it after commit.
    useEffect(() => {
        onLoadMoreRef.current = onLoadMore
    })

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
