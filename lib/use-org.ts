'use client'

import { useParams } from 'next/navigation'
import { orgPath } from '@/lib/subdomain'

export function useOrgSlug(): string {
  return useParams<{ slug: string }>().slug
}

export function useOrgPath(path = '/dashboard'): string {
  return orgPath(useOrgSlug(), path)
}
