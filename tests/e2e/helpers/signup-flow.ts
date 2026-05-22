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
 * Drives a brand-new user through:
 *   1. Fill /auth/signup and submit.
 *   2. Wait for the Supabase confirmation email to arrive at Resend.
 *   3. Visit the /auth/confirm link.
 *   4. Log in via /auth/login.
 *   5. Resolve once the page is at /dashboard/new (user has zero orgs).
 *
 * Caller MUST use a browser context with no shared storageState so the signup
 * starts logged-out (see playwright.config.ts `chrome-unauthed` project).
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

    // Wait for the inbound verification email — Resend inbound must be wired
    // for RESEND_INBOUND_DOMAIN, and Supabase must send from RESEND_FROM_ADDRESS.
    const fromAddress = process.env.RESEND_FROM_ADDRESS ?? "auth@hikyaku.org"
    const { confirmUrl } = await waitForVerificationEmail({
        toAddress: credentials.email,
        fromAddress,
        since: submittedAt,
        timeoutMs: options.verificationTimeoutMs ?? 60_000,
    })

    // The signup form auto-signs-in. Clear that session so visiting the
    // confirm link + logging in is a clean flow that any real user could perform.
    await page.context().clearCookies()

    await page.goto(confirmUrl)

    await page.goto("/auth/login")
    await page.getByRole("button", { name: /email & password/i }).click()
    await page.locator("#email").fill(credentials.email)
    await page.locator("#password").fill(credentials.password)
    await page.getByRole("button", { name: /^login$/i }).click()

    // Fresh users have no org — the login-form redirects them to /orgs/new.
    await expect(page).toHaveURL(/\/orgs\/new$/, { timeout: 15_000 })

    return credentials
}
