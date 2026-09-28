import { expect, type Page } from "@playwright/test"
import { faker } from "@faker-js/faker"

import { uniqueSignupEmail } from "./test-data"
import { waitForVerificationEmail } from "./resend"

export type SignupCredentials = {
    email: string
    password: string
    displayName: string
}

type SignupOptions = Partial<SignupCredentials> & {
    verificationTimeoutMs?: number
}

/**
 * Sign up a new user:
 *   1. Submit /auth/signup.
 *   2. Wait for the confirmation email in Resend.
 *   3. Open the /auth/confirm link.
 *   4. Log in at /auth/login.
 *   5. Wait for the personal org's dashboard.
 *
 * Use a context with no storageState, so the user starts signed out (the
 * `chrome-unauthed` project in playwright.config.ts).
 */
export async function signUpAndConfirm(page: Page, options: SignupOptions = {}): Promise<SignupCredentials> {
    const credentials: SignupCredentials = {
        email: options.email ?? uniqueSignupEmail(),
        password: options.password ?? "Test123!Pass",
        displayName: options.displayName ?? faker.person.fullName(),
    }

    const submittedAt = new Date(Date.now() - 5_000)

    await page.goto("/auth/signup")
    await page.locator("#displayName").fill(credentials.displayName)
    await page.locator("#email").fill(credentials.email)
    await page.locator("#password").fill(credentials.password)
    await page.locator("#repeat-password").fill(credentials.password)
    await page.getByRole("button", { name: /^sign up$/i }).click()

    // Needs Resend inbound on RESEND_INBOUND_DOMAIN, and Supabase sending from
    // RESEND_FROM_ADDRESS.
    const fromAddress = process.env.RESEND_FROM_ADDRESS ?? "auth@hikyaku.org"
    const { confirmUrl } = await waitForVerificationEmail({
        toAddress: credentials.email,
        fromAddress,
        since: submittedAt,
        timeoutMs: options.verificationTimeoutMs ?? 60_000,
    })

    // Signup signs the user in. Clear that session, so the confirm link and
    // login run like they do for a real user.
    await page.context().clearCookies()

    await page.goto(confirmUrl)

    await page.goto("/auth/login")
    await page.locator("#email").fill(credentials.email)
    await page.locator("#password").fill(credentials.password)
    // Exact match, because "Sign in with Google" can also show.
    await page.getByRole("button", { name: "Sign in", exact: true }).click()

    // New users have a personal org, so login opens its dashboard.
    await expect(page).toHaveURL(/\/orgs\/[a-z0-9-]+\/dashboard\/?$/, { timeout: 15_000 })

    return credentials
}
