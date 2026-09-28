import { expect, test } from "@playwright/test"
import { faker } from "@faker-js/faker"

import { signUpAndConfirm } from "./helpers/signup-flow"

/** Runs in the `chrome-unauthed` project, so it starts signed out. */
test.describe("Auth: signup + email confirm", () => {
    test("new user signs up, confirms email, lands directly on personal org dashboard", async ({ page }) => {
        test.setTimeout(120_000)

        // signUpAndConfirm checks that the user lands on the personal org dashboard.
        await signUpAndConfirm(page)

        // The org switcher trigger shows "Personal" for a nameless personal org.
        const trigger = page.locator('[aria-haspopup="menu"]').first()
        await expect(trigger).toContainText(/personal/i)
    })

    test("signed-up user can still create a company org via /orgs/new", async ({ page }) => {
        test.setTimeout(120_000)

        await signUpAndConfirm(page)

        await page.goto("/orgs/new")
        const orgName = `${faker.company.name().replace(/[^a-zA-Z0-9-]/g, "-")}-${Date.now()}`
        await page.locator("#org-name").fill(orgName)
        await page.getByRole("button", { name: /create company/i }).click()

        await expect(page).toHaveURL(/\/orgs\/[a-z0-9-]+\/dashboard\/?$/, {
            timeout: 20_000,
        })

        // The org switcher trigger shows the current org name.
        const trigger = page.locator('[aria-haspopup="menu"]').first()
        await expect(trigger).toContainText(orgName)
    })

    test("signed-up user navigates away then back, stays on their personal org dashboard", async ({ page }) => {
        test.setTimeout(120_000)

        await signUpAndConfirm(page)

        // Go to an external site, then back to /orgs.
        await page.goto("https://google.com")
        await page.goto("http://localhost:3000/orgs")

        // /orgs opens the personal org again, not /orgs/new.
        await expect(page).toHaveURL(/\/orgs\/[a-z0-9-]+\/dashboard\/?$/, { timeout: 15_000 })
    })
})
