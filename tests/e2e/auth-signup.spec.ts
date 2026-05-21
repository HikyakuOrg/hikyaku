import { expect, test } from "@playwright/test"
import { faker } from "@faker-js/faker"

import { signUpAndConfirm } from "./helpers/signup-flow"

/**
 * Lives under the `chrome-unauthed` Playwright project so it starts with no
 * shared storageState (the default `chrome` project would already be logged
 * in as the demo seed user, which would break a brand-new signup).
 */
test.describe("Auth — signup + email confirm", () => {
    test("new user signs up, confirms email, creates org, lands on tenant", async ({ page }) => {
        test.setTimeout(120_000)

        await signUpAndConfirm(page)

        const orgName = `${faker.company.name().replace(/[^a-zA-Z0-9-]/g, "-")}-${Date.now()}`
        await page.locator("#org-name").fill(orgName)
        await page.getByRole("button", { name: /create organization/i }).click()

        await expect(page).toHaveURL(/^https?:\/\/[a-z0-9-]+\.lvh\.me:3000\/dashboard\/?$/i, {
            timeout: 20_000,
        })

        // The org switcher trigger shows the current org name.
        const trigger = page.locator('[aria-haspopup="menu"]').first()
        await expect(trigger).toContainText(orgName)
    })

    test("signed-up user without an org navigates away then back, gets bounced to /dashboard/new", async ({ page }) => {
        test.setTimeout(120_000)

        await signUpAndConfirm(page)

        // Currently sitting on /dashboard/new. Navigate to external site, then back.
        await page.goto("https://google.com")
        await page.goto("http://lvh.me:3000/dashboard")

        // Middleware sees an authed user with zero orgs and bounces them.
        await expect(page).toHaveURL(/\/dashboard\/new$/, { timeout: 15_000 })
    })
})
