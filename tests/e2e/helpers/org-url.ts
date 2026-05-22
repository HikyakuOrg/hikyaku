/**
 * Returns an absolute path to a dashboard route for the test org.
 * PLAYWRIGHT_ORG_SLUG is set by playwright.global-setup.ts after login.
 */
export function d(path = ''): string {
    const slug = process.env.PLAYWRIGHT_ORG_SLUG
    if (!slug) throw new Error('PLAYWRIGHT_ORG_SLUG not set — check playwright.global-setup.ts')
    return `/orgs/${slug}/dashboard${path}`
}
